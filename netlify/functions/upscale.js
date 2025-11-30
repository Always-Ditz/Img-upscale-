const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Parse multipart form data
        const { fields, files } = await parseMultipartForm(event);
        
        const scale = parseInt(fields.scale) || 4;
        const imageBuffer = files.image;

        if (!imageBuffer) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No image provided' })
            };
        }

        // Call upscale function
        const resultUrl = await imgupscale(imageBuffer, { scale });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                url: resultUrl 
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error' 
            })
        };
    }
};

// Parse multipart form data
function parseMultipartForm(event) {
    return new Promise((resolve, reject) => {
        const fields = {};
        const files = {};

        const bb = busboy({
            headers: {
                'content-type': event.headers['content-type'] || event.headers['Content-Type']
            }
        });

        bb.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        bb.on('file', (fieldname, file, info) => {
            const chunks = [];
            file.on('data', (data) => {
                chunks.push(data);
            });
            file.on('end', () => {
                files[fieldname] = Buffer.concat(chunks);
            });
        });

        bb.on('finish', () => {
            resolve({ fields, files });
        });

        bb.on('error', reject);

        bb.write(Buffer.from(event.body, 'base64'));
        bb.end();
    });
}

// Image upscale function
async function imgupscale(image, { scale = 4 } = {}) {
    try {
        const scales = [1, 4, 8, 16];
        
        if (!Buffer.isBuffer(image)) {
            throw new Error('Image must be a buffer.');
        }
        
        if (!scales.includes(scale) || isNaN(scale)) {
            throw new Error(`Available scale options: ${scales.join(', ')}.`);
        }
        
        const identity = uuidv4();
        const inst = axios.create({
            baseURL: 'https://supawork.ai/supawork/headshot/api',
            headers: {
                authorization: 'null',
                origin: 'https://supawork.ai/',
                referer: 'https://supawork.ai/ai-photo-enhancer',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-auth-challenge': '',
                'x-identity-id': identity
            }
        });
        
        // Get upload token
        const { data: up } = await inst.get('/sys/oss/token', {
            params: {
                f_suffix: 'png',
                get_num: 1,
                unsafe: 1
            }
        });
        
        const img = up?.data?.[0];
        if (!img) {
            throw new Error('Upload url not found.');
        }
        
        // Upload image
        await axios.put(img.put, image, {
            headers: {
                'Content-Type': 'image/png'
            }
        });
        
        // Get CF token
        const { data: cf } = await axios.post('https://api.nekolabs.web.id/tools/bypass/cf-turnstile', {
            url: 'https://supawork.ai/ai-photo-enhancer',
            siteKey: '0x4AAAAAACBjrLhJyEE6mq1c'
        });
        
        if (!cf?.result) {
            throw new Error('Failed to get cf token.');
        }
        
        // Get challenge token
        const { data: t } = await inst.get('/sys/challenge/token', {
            headers: {
                'x-auth-challenge': cf.result
            }
        });
        
        if (!t?.data?.challenge_token) {
            throw new Error('Failed to get token.');
        }
        
        // Create upscale task
        const { data: task } = await inst.post('/media/image/generator', {
            aigc_app_code: 'image_enhancer',
            model_code: 'supawork-ai',
            image_urls: [img.get],
            extra_params: {
                scale: parseInt(scale)
            },
            currency_type: 'silver',
            identity_id: identity
        }, {
            headers: {
                'x-auth-challenge': t.data.challenge_token
            }
        });
        
        if (!task?.data?.creation_id) {
            throw new Error('Failed to create task.');
        }
        
        // Poll for result
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds timeout
        
        while (attempts < maxAttempts) {
            const { data } = await inst.get('/media/aigc/result/list/v1', {
                params: {
                    page_no: 1,
                    page_size: 10,
                    identity_id: identity
                }
            });
            
            const list = data?.data?.list?.[0]?.list?.[0];
            
            if (list && list.status === 1) {
                return list.url;
            }
            
            await new Promise(res => setTimeout(res, 1000));
            attempts++;
        }
        
        throw new Error('Upscale timeout. Please try again.');
        
    } catch (error) {
        throw new Error(error.message);
    }
          }

const axios = require('axios');

exports.handler = async (event, context) => {
    // Allow GET and OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Get URL from query parameter
        const url = event.queryStringParameters?.url;

        if (!url) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'URL parameter is required' })
            };
        }

        // Validate URL - harus dari Supawork
        if (!url.includes('supawork.ai')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid URL source' })
            };
        }

        console.log('Downloading from:', url);

        // Download image dengan headers yang proper
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 seconds timeout untuk file besar
            maxContentLength: 100 * 1024 * 1024, // Max 100MB
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/png,image/jpeg,image/webp,image/*'
            }
        });

        // Detect content type
        const contentType = response.headers['content-type'] || 'image/png';
        
        console.log('Download success, size:', response.data.length, 'type:', contentType);

        // Return image dengan proper headers
        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': response.data.length.toString(),
                'Content-Disposition': 'attachment; filename="upscaled-image.png"',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            },
            body: response.data.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Download error:', error.message);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to download image',
                details: error.message,
                url: event.queryStringParameters?.url
            })
        };
    }
};

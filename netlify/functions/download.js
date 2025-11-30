const axios = require('axios');

exports.handler = async (event, context) => {
    // Only allow GET
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

        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid URL' })
            };
        }

        // Download image
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Return image with proper headers
        return {
            statusCode: 200,
            headers: {
                'Content-Type': response.headers['content-type'] || 'image/png',
                'Content-Disposition': 'attachment; filename="upscaled-image.png"',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            },
            body: response.data.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Download error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to download image',
                details: error.message 
            })
        };
    }
};

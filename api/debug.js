const axios = require('axios');

const BASE_URL = 'https://net22.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const cookies = process.env.CF_COOKIES || '(NOT SET)';
    const cookiePreview = cookies.substring(0, 60) + '...';
    
    let fetchResult = {};
    try {
        const { data: html, status, headers: respHeaders } = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': BASE_URL,
            },
            timeout: 15000,
            validateStatus: () => true, // Don't throw on non-2xx
        });

        // Extract title
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '(no title found)';
        
        fetchResult = {
            httpStatus: status,
            pageTitle: title,
            htmlLength: html.length,
            htmlSnippet: html.substring(0, 500),
            isCloudflare: title.toLowerCase().includes('verification') || 
                          title.toLowerCase().includes('just a moment') || 
                          title.toLowerCase().includes('cloudflare'),
            responseHeaders: {
                server: respHeaders['server'],
                'cf-ray': respHeaders['cf-ray'],
                'content-type': respHeaders['content-type'],
            },
        };
    } catch (err) {
        fetchResult = { error: err.message };
    }

    res.status(200).json({
        success: true,
        debug: {
            cookieSet: cookies !== '(NOT SET)',
            cookiePreview,
            nodeEnv: process.env.NODE_ENV || '(not set)',
            vercelRegion: process.env.VERCEL_REGION || '(not set)',
            fetchResult,
        },
    });
};

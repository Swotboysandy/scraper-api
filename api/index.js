module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    message: 'Scraper API is running',
    endpoints: {
      home: '/api/home',
      search: '/api/search?q=QUERY',
      details: '/api/details?id=ID',
      stream: '/api/stream?id=ID',
    }
  });
};

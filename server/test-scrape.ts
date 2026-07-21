import axios from 'axios';
import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://star.setn.com/news/1875839';
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' } });
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, iframe, noscript').remove();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    console.log("Extracted text length:", textContent.length);
    console.log("Preview:", textContent.substring(0, 500));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
main();

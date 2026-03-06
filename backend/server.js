const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- SUPABASE BAĞLANTISI (Burayı doldur) ---
const supabaseUrl = 'https://gzlcvtesjwdnlsrhvcxy.supabase.co';
const supabaseKey = 'sb_publishable_C3De6Tlfkm_HqE9hS_le0g_HG3VYkCd'; // Oradaki anon public key'i buraya yapıştır
const supabase = createClient(supabaseUrl, supabaseKey);

// --- E-POSTA AYARLARI ---
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'farikaroller1@gmail.com',
    pass: 'aljkzmvblrzrsvrn'
  }
});

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.123/RemoteMon',
});

async function login() {
  // Buradaki token'ı Chrome'dan aldığın güncel token ile değiştir
  axiosInstance.defaults.headers.common['Cookie'] = 'PHPSESSID=c3d0999da4eb68782d08bc58fbf9de58';
}

// VERİYİ KAYDETME
async function saveTemperatureData(data, time) {
  try {
    if (Array.isArray(data) && data.length > 0) {
      const rows = data.map(d => ({
        sensor_name: d.name,
        value: d.value,
        time: time
      }));

      const { error } = await supabase.from('tempv3').insert(rows);
      if (error) throw error;
      console.log("Veriler Supabase'e kaydedildi!");
    }
  } catch (error) {
    console.error("Kayıt hatası:", error);
  }
}

function parseHTMLData(html) {
  const $ = cheerio.load(html);
  const rows = $('tr');
  return Array.from(rows).map(row => {
    const name = $(row).find('span').text();
    const value = parseFloat($(row).find('td:nth-child(2)').text());
    return { name, value };
  }).filter(d => d.name && !isNaN(d.value));
}

async function getTemperaturesDataFromLocal() {
  const currTime = new Date().getTime();
  try {
    await login();
    const response = await axiosInstance.get('/Data/1.php', {
      params: { _: currTime }
    });
    const parsedData = parseHTMLData(response.data);
    await saveTemperatureData(parsedData, currTime);
  } catch (error) {
    console.error('PLC Veri çekme hatası:', error);
  }
}

// 5 dakikada bir çalıştır
setInterval(() => getTemperaturesDataFromLocal(), 300000);

app.listen(PORT, () => { 
  console.log(`Sunucu ${PORT} portunda çalışıyor. Veriler Supabase'e gönderilecek.`); 
});
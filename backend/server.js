// const express = require('express');
// const axios = require('axios');
// const cors = require('cors');
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const cheerio = require('cheerio');
// const http = require('http');
// const request = require('request');
// const app = express();
// const PORT = 3000;


// app.use(cors());
// app.use(express.json());


// app.listen(PORT, () => { console.log('its working on the port') })

// // MongoDB Connection
// const uri = "mongodb+srv://hamzakaya:hmzhmzkyuserpass@cluster0.anjjarf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// // Establish MongoDB connection
// let db;
// client.connect()
//   .then(() => {
//     db = client.db("temperature_data");
//     console.log("You successfully connected to MongoDB!");

//     setInterval(() => getTemperaturesDataFromLocal(), 300000)
//   })
//   .catch(err => {
//     console.error("Failed to connect to MongoDB", err);
//   });

// const pushToDB = (collection, name, values) => {
//   collection.updateOne({ "name": name }, { $push: { values } })
// }

// // Function to insert data into MongoDB
// async function saveTemperatureData(data, time) {
//   try {
//     const collection = await db.collection("tempV3");

//     if (typeof data === 'object' && data.length) {
//       data.forEach(d => {
//         if (d.value > 0) {
//           pushToDB(collection, d.name, { value: d.value, time })
//         } else {
//           pushToDB(collection, d.name, { value: null, time })
//         }
//       })
//     }


//   } catch (error) {
//     console.error("Failed to save data to MongoDB:", error);
//   }
// }

// // Axios instance with base URL
// const axiosInstance = axios.create({
//   baseURL: 'http://192.168.1.123/RemoteMon',
// });

// // Function to get PHPSESSID cookie
// async function login() {
//   axiosInstance.defaults.headers.common['Cookie'] = 'PHPSESSID=a6d894c905befa000bf4db4bc2c87dec';
// }


// const getTemperaturesDataFromLocal = async () => {
//   const currTime = new Date().getTime()
//   try {
//     await login(); // Ensure we are logged in and have a cookie
//     const response = await axiosInstance.get('/Data/1.php', {
//       params: { _: currTime } // Unique query param to avoid caching
//     });

//     const fetchedData = response.data;
//     const parsedData = parseHTMLData(fetchedData); // Parse the HTML data
//     await saveTemperatureData(parsedData, currTime);
//   } catch (error) {
//     console.error('Failed to fetch and save external data:', error);
//   }
// }


// // Function to parse HTML and convert to JSON format
// function parseHTMLData(html) {
//   const $ = cheerio.load(html);
//   const rows = $('tr');
//   const parsedData = Array.from(rows).map(row => {
//     const name = $(row).find('span').text();
//     const value = parseFloat($(row).find('td:nth-child(2)').text());
//     return { name, value };
//   }).filter(d => d.name && !isNaN(d.value));

//   // console.log(parsedData);
  
  
//   return parsedData;
// }












const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.listen(PORT, () => { console.log('its working on the port') });

// MongoDB Connection
const uri = "mongodb+srv://hamzakaya:hmzhmzkyuserpass@cluster0.anjjarf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

// E-posta gönderimi için ayarlar
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'farikaroller1@gmail.com',
    pass: 'aljkzmvblrzrsvrn'
  }
});

function sendEmailNotification(subject, text) {
  let mailOptions = {
    from: 'farikaroller1@gmail.com',
    to: 'sahin27443@gmail.com',
    subject: subject,
    text: text
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.error("E-posta gönderilirken hata oluştu:", error);
    } else {
      console.log('E-posta gönderildi: ' + info.response);
    }
  });
}

client.connect()
  .then(() => {
    db = client.db("temperature_data");
    console.log("You successfully connected to MongoDB!");

    // Her 5 dakikada bir veri çek ve kontrol et
    setInterval(() => getTemperaturesDataFromLocal(), 300000);
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.123/RemoteMon',
});

async function login() {
  axiosInstance.defaults.headers.common['Cookie'] = 'PHPSESSID=c3d0999da4eb68782d08bc58fbf9de58';
}

// MongoDB'ye veri ekleme
const pushToDB = (collection, name, values) => {
  collection.updateOne(
    { "name": name },
    { $push: { values: values } },
    { upsert: true }
  )
}

// Veriyi kaydetme fonksiyonu
async function saveTemperatureData(data, time) {
  try {
    const collection = db.collection("tempV3");
    if (Array.isArray(data) && data.length > 0) {
      for (const d of data) {
        pushToDB(collection, d.name, { value: d.value, time });
      }
    }
  } catch (error) {
    console.error("Failed to save data to MongoDB:", error);
  }
}

// Her 5 dakikada bir veri çek
async function getTemperaturesDataFromLocal() {
  const currTime = new Date().getTime();
  try {
    await login(); 
    const response = await axiosInstance.get('/Data/1.php', {
      params: { _: currTime }
    });

    const fetchedData = response.data;
    const parsedData = parseHTMLData(fetchedData); 

    // Önce eski verileri DB'den alalım
    const oldData = await getLastDataFromDB(parsedData.map(d => d.name));

    // Karşılaştır
    compareDataAndSendEmailIfNeeded(oldData, parsedData);

    // Yeni veriyi kaydet
    await saveTemperatureData(parsedData, currTime);

  } catch (error) {
    console.error('Failed to fetch and save external data:', error);
  }
}

// DB'den her sensör için son kaydı çekme
async function getLastDataFromDB(sensorNames) {
  const collection = db.collection("tempV3");
  // Her sensör için son değeri al
  // values dizisinin son elemanını almak için values'u -1 slice ile çekebiliriz.
  let oldData = [];

  for (const name of sensorNames) {
    const doc = await collection.findOne({ name: name }, {
      projection: {
        values: { $slice: -1 } // Son eleman
      }
    });

    if (doc && doc.values && doc.values.length > 0) {
      oldData.push({ name: doc.name, value: doc.values[0].value });
    } else {
      // Eğer kayıt yoksa demek ki ilk defa bu sensörü kaydediyoruz
      // O zaman eski değeri yok sayabiliriz
    }
  }

  return oldData;
}

// Karşılaştırma yap
function compareDataAndSendEmailIfNeeded(oldData, newData) {
  // oldData ve newData her sensörün son değerlerini içeriyor
  // oldData da olmayabilir, bu durumda o sensör için karşılaştırma yapamayız

  for (const currItem of newData) {
    const oldItem = oldData.find(o => o.name === currItem.name);
    if (!oldItem) continue; // Daha önce veri yoksa karşılaştıramayız

    const diff = Math.abs(currItem.value - oldItem.value);
    if (diff > 5) {
      sendEmailNotification(
        "Sıcaklık Uyarısı!",
        `${currItem.name} sensöründe sıcaklık 5 dereceden fazla değişti. Eski: ${oldItem.value}°, Yeni: ${currItem.value}°`
      );
    }
  }
}

// HTML parse et
function parseHTMLData(html) {
  const $ = cheerio.load(html);
  const rows = $('tr');
  const parsedData = Array.from(rows).map(row => {
    const name = $(row).find('span').text();
    const value = parseFloat($(row).find('td:nth-child(2)').text());
    return { name, value };
  }).filter(d => d.name && !isNaN(d.value));

  return parsedData;
}



















































// const express = require('express');
// const axios = require('axios');
// const cors = require('cors');
// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // ObjectId'yi ekledik
// const cheerio = require('cheerio');
// const http = require('http');
// const request = require('request');
// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(express.json());

// app.listen(PORT, () => { console.log('its working on the port') })

// // MongoDB Connection
// const uri = "mongodb+srv://hamzakaya:hmzhmzkyuserpass@cluster0.anjjarf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// // Function to delete document with a specific _id
// async function deleteDocumentById() {
//   try {
//     const collection = await db.collection("tempV3"); // tempV3 koleksiyonunu kullan
//     const result = await collection.deleteOne({ _id: new ObjectId("670f9f6319c989a5526d791a") }); // ObjectId ile new kullanarak sil
//     if (result.deletedCount > 0) {
//       console.log("Document with _id 670f9f6319c989a5526d791a deleted successfully");
//     } else {
//       console.log("Document not found or already deleted");
//     }
//   } catch (error) {
//     console.error("Failed to delete document:", error);
//   }
// }

// // Establish MongoDB connection
// let db;
// client.connect()
//   .then(() => {
//     db = client.db("temperature_data");
//     console.log("You successfully connected to MongoDB!");

//     // Call deleteDocumentById function after successful connection
//     deleteDocumentById();  // Bağlantı sağlandıktan sonra silme işlemi yapılacak
//   })
//   .catch(err => {
//     console.error("Failed to connect to MongoDB", err);
//   });

// const pushToDB = (collection, name, values) => {
//   collection.updateOne({ "name": name }, { $push: { values } })
// }

// // Function to insert data into MongoDB
// async function saveTemperatureData(data, time) {
//   try {
//     const collection = await db.collection("tempV3");

//     if (typeof data === 'object' && data.length) {
//       data.forEach(d => {
//         if (d.value > 0) {
//           pushToDB(collection, d.name, { value: d.value, time })
//         } else {
//           pushToDB(collection, d.name, { value: null, time })
//         }
//       })
//     }

//   } catch (error) {
//     console.error("Failed to save data to MongoDB:", error);
//   }
// }

// // Axios instance with base URL
// const axiosInstance = axios.create({
//   baseURL: 'http://192.168.1.123/RemoteMon',
// });

// // Function to get PHPSESSID cookie
// async function login() {
//   axiosInstance.defaults.headers.common['Cookie'] = 'PHPSESSID=6b31790612a77bc574f72567759b3f78';
// }

// const getTemperaturesDataFromLocal = async () => {
//   const currTime = new Date().getTime()
//   try {
//     await login(); // Ensure we are logged in and have a cookie
//     const response = await axiosInstance.get('/Data/1.php', {
//       params: { _: currTime } // Unique query param to avoid caching
//     });

//     const fetchedData = response.data;
//     const parsedData = parseHTMLData(fetchedData); // Parse the HTML data
//     await saveTemperatureData(parsedData, currTime);
//   } catch (error) {
//     console.error('Failed to fetch and save external data:', error);
//   }
// }

// // Function to parse HTML and convert to JSON format
// function parseHTMLData(html) {
//   const $ = cheerio.load(html);
//   const rows = $('tr');
//   const parsedData = Array.from(rows).map(row => {
//     const name = $(row).find('span').text();
//     const value = parseFloat($(row).find('td:nth-child(2)').text());
//     return { name, value };
//   }).filter(d => d.name && !isNaN(d.value));

//   return parsedData;
// }
















// const express = require('express');
// const axios = require('axios');
// const cors = require('cors');
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const cheerio = require('cheerio');
// const http = require('http');
// const request = require('request');
// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(express.json());

// app.listen(PORT, () => { 
//   console.log('its working on the port') 
// });

// // MongoDB Connection
// const uri = "mongodb+srv://hamzakaya:hmzhmzkyuserpass@cluster0.anjjarf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// // Establish MongoDB connection
// let db;
// client.connect()
//   .then(() => {
//     db = client.db("temperature_data");
//     console.log("You successfully connected to MongoDB!");

//     setInterval(() => getTemperaturesDataFromLocal(), 300000); // 5 dakika aralıklarla veri çek
//   })
//   .catch(err => {
//     console.error("Failed to connect to MongoDB", err);
//   });

// // Function to push data to MongoDB
// const pushToDB = (collection, name, values) => {
//   collection.updateOne(
//     { "name": name },
//     { $push: { values: values } },
//     { upsert: true } // Eğer kayıt yoksa oluştur
//   );
// };


// // Function to save temperature data into MongoDB
// // Function to save temperature data into MongoDB
// async function saveTemperatureData(data, time) {
//   try {
//     const collection = await db.collection("tempV3");

//     if (Array.isArray(data)) {
//       data.forEach(d => {
//         // Eğer isim 'SET' içeriyorsa 'setValue' kullan, yoksa sadece 'value' kullan
//         if (d.name.includes('SET')) {
//           pushToDB(collection, d.name, { value: d.value, time });
//         } else {
//           pushToDB(collection, d.name, { value: d.value, time });
//         }
//       });
//     }

//   } catch (error) {
//     console.error("Failed to save data to MongoDB:", error);
//   }
// }


// // Axios instance with base URL
// const axiosInstance = axios.create({
//   baseURL: 'http://192.168.1.123/RemoteMon',
// });

// // Function to get PHPSESSID cookie
// async function login() {
//   axiosInstance.defaults.headers.common['Cookie'] = 'PHPSESSID=599af4457ab1617eb322248ebd43a343';
// }

// // Function to fetch temperatures data from the local server
// const getTemperaturesDataFromLocal = async () => {
//   const currTime = new Date().getTime();
//   try {
//     await login(); // Ensure we are logged in and have a cookie
//     const response = await axiosInstance.get('/Data/1.php', {
//       params: { _: currTime } // Unique query param to avoid caching
//     });

//     const fetchedData = response.data;
//     const parsedData = parseHTMLData(fetchedData); // Parse the HTML data
//     await saveTemperatureData(parsedData, currTime);
//   } catch (error) {
//     console.error('Failed to fetch and save external data:', error);
//   }
// };

// // Function to parse HTML and convert to JSON format
// // Function to parse HTML and convert to JSON format
// function parseHTMLData(html) {
//   const $ = cheerio.load(html);
//   const rows = $('tr'); // Tüm tablo satırlarını alıyoruz
//   const parsedData = Array.from(rows).map(row => {
//     const name = $(row).find('span').text(); // Satırdaki ismi alıyoruz (örneğin: A8, A8SET)
//     const value = parseFloat($(row).find('td:nth-child(2)').text()); // İkinci sütundaki sıcaklık değerini alıyoruz

//     // Sadece 'SET' içeren isimleri, kendi başlarına değer olarak döndürüyoruz
//     return { name, value };
//   }).filter(d => d.name && !isNaN(d.value)); // Geçerli isim ve sıcaklık değerleri olanları döndürüyoruz

//   console.log(parsedData); // İşlenen veriyi logluyoruz
//   return parsedData;
// }


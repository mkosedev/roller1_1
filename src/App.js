import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import * as Realm from "realm-web";
import LineChart from "./components/LineChart";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// Excel verisi için formatlama fonksiyonu
const prepareDataForExcel = (data) => {
  const excelData = [];
  const keys = Object.keys(data).filter((key) => key !== "saat");

  data.saat.forEach((time, index) => {
    const row = { Time: time };
    keys.forEach((key) => {
      row[key] = data[key][index] || 0;
    });
    excelData.push(row);
  });

  return excelData;
};

// Excel dosyasını oluşturma ve indirme fonksiyonu
const exportToExcel = (data) => {
  const formattedData = prepareDataForExcel(data);
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Temperature Data");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });
  saveAs(dataBlob, "Temperature_Data.xlsx");
};

// Min-max hesaplama fonksiyonu
const calculateMinMax = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return "N/A";
  }
  const min = Math.floor((Math.min(...arr) - 10) / 10) * 10;
  const max = Math.ceil((Math.max(...arr) + 10) / 10) * 10;
  return `${min}-${max}`;
};

// Unix timestamp'ı insan okunabilir tarihe çevirme fonksiyonu
const timeStampToHumanDate = (timeStamp) => {
  const date = new Date(timeStamp);
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  const day = date.toLocaleDateString();
  const formattedTime = `${day}-${hours}:${minutes.substr(-2)}:${seconds.substr(
    -2
  )}`;
  return formattedTime;
};

// Veriyi dönüştürme fonksiyonu
const transformData = (data) => {
  const transformed = {};
  if (data.length) {
    transformed["saat"] = data[0]?.values.map((e) =>
      timeStampToHumanDate(e.time)
    );
    data.forEach((d) => {
      transformed[d.name] = d?.values.map((e) => e.value);
    });
  }
  delete transformed["SÜRE"];
  return transformed;
};

function App() {
  const [user, setUser] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);
  const [chartData, setChartData] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataLimit, setDataLimit] = useState(110); // Varsayılan veri limiti

  const colors = {
    A8: "#ff9f1c",
    A9: "#f9c159",
    A10: "#f6e887",
    A11: "#b0f5ba",
    A12: "#9ceaef",
    A13: "#d2d7e7",
    A14: "#afbcc1",
    A15: "#fdfdcc",
    A16: "#e3e7e7",
    A17: "#ffd7b5",
    A18: "#ccd5ae",
    A19: "#e9edc9",
    A20: "#fefae0",
    A21: "#faedcd",
    A22: "#d4a373",
    "GRS BACA": "#e4b19b",
    SÜRE: "#ccd5ae",
  };

  const appId = "data-xnlepwl";
  const mongoDBEndpoint =
    "https://eu-central-1.aws.data.mongodb-api.com/app/data-xnlepwl/endpoint/data/v1/action/";

  // MongoDB'ye e-posta ve şifre ile giriş yapma fonksiyonu
  const loginEmailPassword = async (email, password) => {
    const app = new Realm.App({ id: appId });
    const credentials = Realm.Credentials.emailPassword(email, password);
    const loggedUser = await app.logIn(credentials);
    return loggedUser.accessToken;
  };

  // Veriyi çeken fonksiyonu useCallback ile sarmalıyoruz
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dataRequest = JSON.stringify({
        collection: "tempV3",
        database: "temperature_data",
        dataSource: "Cluster0",
      });

      const config = {
        method: "post",
        url: `${mongoDBEndpoint}find`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
        },
        data: dataRequest,
      };

      const response = await axios(config);
      const responseData = response.data.documents;

      if (responseData.length === 0) {
        setChartData({});
        setIsLoading(false);
        return;
      }

      const sortedData = responseData.map((d) => ({
        ...d,
        values: d.values.sort((a, b) => a.time - b.time),
      }));

      const filteredData = sortedData.map((d) => {
        const values = d.values;

        if (startDate && endDate) {
          const firstIndex = values.findIndex(
            (v) => v.time >= new Date(startDate).getTime()
          );
          const lastIndex =
            values.findIndex((v) => v.time >= new Date(endDate).getTime()) - 1;

          if (firstIndex === -1 || lastIndex === -1) return d;

          return {
            ...d,
            values: values.slice(firstIndex, lastIndex + 1),
          };
        }

        // Veriyi dizinin sonundan alıp her zaman kesin bir sınır koyuyoruz
        const limitedValues = values.slice(
          Math.max(values.length - dataLimit, 0)
        );

        return {
          ...d,
          values: limitedValues,
        };
      });

      const transformedData = transformData(filteredData);
      setChartData(transformedData);
    } catch (error) {
      console.error("Data fetching error:", error);
      setChartData({});
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate, dataLimit]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const accessToken = await loginEmailPassword(
          "hamzakaya4343@gmail.com",
          "hmzhmzky"
        );
        setUser(accessToken);
      } catch (error) {
        console.error(error);
      }
    };

    initializeUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchData(); // İlk veri çekme işlemi

    const intervalId = setInterval(() => {
      console.log("Interval triggered");
      fetchData(); // 5 dakikada bir veri güncelleme
    }, 300000);

    return () => clearInterval(intervalId);
  }, [user, fetchData]);

  return (
    <div style={{ padding: "20px" }}>
      {/* Veri Limiti Butonları */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setDataLimit(12)}
          style={{
            padding: "10px",
            marginRight: "10px",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Son 12 Veri
        </button>
        <button
          onClick={() => setDataLimit(24)}
          style={{
            padding: "10px",
            marginRight: "10px",
            backgroundColor: "#17a2b8",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Son 24 Veri
        </button>
        <button
          onClick={() => setDataLimit(100)}
          style={{
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Son 100 Veri
        </button>
      </div>

      {/* Üst Ortada Tarih ve Butonların Bulunduğu Alan */}
      <div
        style={{
          display: "flex",
          justifyContent: "center", // Ortaya hizalama
          alignItems: "center", // Dikey ortalama
          marginBottom: "30px", // Alt boşluk
          flexWrap: "wrap",
        }}
      >
        <label style={{ marginRight: "20px" }}>
          Start Date & Time:
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginLeft: "10px" }}
          />
        </label>
        <label style={{ marginRight: "20px" }}>
          End Date & Time:
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginLeft: "10px" }}
          />
        </label>
        <button
          onClick={() => setStartDate("") || setEndDate("")}
          style={{
            marginLeft: "20px",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            marginRight: "20px",
          }}
        >
          Clear Filter
        </button>
        {/* Excel'e veri indirme butonu */}
        <button
          onClick={() => exportToExcel(chartData)}
          style={{
            padding: "10px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Export Data to Excel
        </button>
      </div>

      {/* Diğer içerik */}
      {isLoading ? (
        <div style={{ textAlign: "center", fontSize: "18px" }}>Loading...</div>
      ) : Object.keys(chartData).length === 0 ? (
        <div style={{ textAlign: "center", fontSize: "18px" }}>
          No data available for the selected date range.
        </div>
      ) : expandedChart ? (
        <LineChart
          backgroundColor={colors[expandedChart]}
          yAxisData={chartData[expandedChart]}
          leftYAxisName={calculateMinMax(chartData[expandedChart])}
          rightYAxisName={expandedChart}
          xAxisData={chartData.saat}
          isXAxisShow={true}
          onClick={() => setExpandedChart(expandedChart)}
          isExpanded={true}
          onClose={() => setExpandedChart(null)}
        />
      ) : (
        Object.keys(chartData).map(
          (key) =>
            key !== "saat" && (
              <LineChart
                key={key}
                backgroundColor={colors[key]} // Her grafik için özel arka plan rengi
                yAxisData={chartData[key]}
                leftYAxisName={calculateMinMax(chartData[key])}
                rightYAxisName={key}
                xAxisData={chartData.saat}
                isXAxisShow={key === "GRS BACA"}
                onClick={() => setExpandedChart(key)} // Tıklandığında ilgili grafiği genişletiyoruz
              />
            )
        )
      )}
    </div>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js"; // Supabase eklendi
import LineChart from "./components/LineChart";

// URL ve KEY bilgilerini buraya yapıştır
const supabaseUrl = 'https://gzlcvtesjwdnlsrhvcxy.supabase.co';
const supabaseKey = 'sb_publishable_C3De6Tlfkm_HqE9hS_le0g_HG3VYkCd'; 
const supabase = createClient(supabaseUrl, supabaseKey);

const calculateMinMax = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return "N/A";
  const min = Math.floor((Math.min(...arr) - 10) / 10) * 10;
  const max = Math.ceil((Math.max(...arr) + 10) / 10) * 10;
  return `${min}-${max}`;
};

const timeStampToHumanDate = (timeStamp) => {
  const date = new Date(parseInt(timeStamp));
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();
  const day = date.toLocaleDateString();
  return `${day}-${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
};

function App() {
  const [expandedChart, setExpandedChart] = useState(null);
  const [chartData, setChartData] = useState({});

  const colors = {
    A8: "#ff9f1c", A9: "#f9c159", A10: "#f6e887", A11: "#b0f5ba",
    A12: "#9ceaef", A13: "#d2d7e7", A14: "#afbcc1", A15: "#fdfdcc",
    A16: "#e3e7e7", A17: "#ffd7b5", A18: "#ccd5ae", A19: "#e9edc9",
    A20: "#fefae0", A21: "#faedcd", A22: "#d4a373", "GRS BACA": "#e4b19b",
  };

  const fetchSupabaseData = async () => {
    try {
      // Son 24 saatlik veriyi çek (Tablo adın tempv3 olmalı)
      const { data, error } = await supabase
        .from('tempv3')
        .select('*')
        .order('time', { ascending: true });

      if (error) throw error;

      // Veriyi grafik formatına dönüştür
      const transformed = { saat: [] };
      
      data.forEach(item => {
        const timeLabel = timeStampToHumanDate(item.time);
        if (!transformed.saat.includes(timeLabel)) {
          transformed.saat.push(timeLabel);
        }
        
        if (!transformed[item.sensor_name]) {
          transformed[item.sensor_name] = [];
        }
        transformed[item.sensor_name].push(item.value);
      });

      setChartData(transformed);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  useEffect(() => {
    fetchSupabaseData();

    // CANLI TAKİP: Veritabanına yeni bir şey eklenince grafiği güncelle
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tempv3' }, 
        () => {
          fetchSupabaseData(); // Yeni veri gelince tekrar çek
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      {expandedChart ? (
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
                backgroundColor={colors[key]}
                yAxisData={chartData[key]}
                leftYAxisName={calculateMinMax(chartData[key])}
                rightYAxisName={key}
                xAxisData={chartData.saat}
                isXAxisShow={key === "GRS BACA"}
                onClick={() => setExpandedChart(key)}
              />
            )
        )
      )}
    </div>
  );
}

export default App;
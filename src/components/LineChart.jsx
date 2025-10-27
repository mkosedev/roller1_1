import React from "react";
import ReactEcharts from "echarts-for-react";

export default function LineChart({
  backgroundColor,
  yAxisData,
  leftYAxisName,
  rightYAxisName,
  xAxisData,
  isXAxisShow = false,
  onClick,
  isExpanded = false,
  onClose,
}) {
  const minMax = leftYAxisName && leftYAxisName.split("-");
  const min = parseInt(minMax[0]);
  const max = parseInt(minMax[1]);
  const interval = (max - min) / 4;

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
      formatter: function (params) {
        const date = params[0]?.name.split("-");
        return `${date[0]} <br> ${date[1]} Sıcaklık: <b>${params[0].value}</b>`;
      },
    },
    grid: {
      height: isExpanded ? 250 : 50, // Eğer genişletilmişse yüksekliği arttırıyoruz
      backgroundColor: backgroundColor,
      show: true,
      top: 0,
      bottom: 0,
    },
    legend: {
      data: ["Temperature"],
    },
    xAxis: [
      {
        type: "category",
        axisTick: {
          show: isXAxisShow,
        },
        axisLine: {
          show: isXAxisShow,
        },
        axisLabel: {
          show: isXAxisShow,
          formatter: (val) => val.split("-")[1],
        },
        splitLine: {
          show: false,
        },
        data: xAxisData,
      },
    ],
    yAxis: [
      {
        type: "value",
        name: leftYAxisName,
        position: "left",
        nameRotate: 0,
        nameLocation: "center",
        alignTicks: true,
        min: min,
        max: max,
        interval: interval,
        axisTick: {
          show: true,
        },
        axisLine: {
          show: true,
        },
        axisLabel: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#ccc",
            type: "dotted",
          },
        },
      },
      {
        type: "category",
        name: rightYAxisName,
        nameLocation: "center",
        nameRotate: 0,
        position: "right",
        alignTicks: true,
        axisLine: {
          show: true,
        },
      },
    ],
    series: [
      {
        type: "line",
        yAxisIndex: 0,
        data: yAxisData,
      },
    ],
  };

  return (
    <div
      style={{
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        width: "100%",
      }}
      onClick={onClick}
    >
      <ReactEcharts
        option={option}
        style={{
          height: isExpanded ? "300px" : isXAxisShow ? "150px" : "50px",
          width: "100%",
        }}
      />
      {isExpanded && (
        <button
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "#ff4d4f",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            padding: "5px 10px",
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation(); // Butona tıklandığında grafiğin tıklama olayını tetiklememek için
            onClose && onClose();
          }}
        >
          Close
        </button>
      )}
    </div>
  );
}

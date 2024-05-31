// src/components/LineChartComponent.js
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const LineChartComponent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchTransactions() {
      const { data: credits, error: creditError } = await supabase
        .from("credits")
        .select("date, amount_usd");
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("date, amount_usd");
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("date, amount_usd");
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("date, amount_usd");

      if (creditError || paymentError || salesError || withdrawalsError) {
        console.error(
          "Error fetching transactions:",
          creditError || paymentError || salesError || withdrawalsError
        );
      } else {
        const combinedData = [
          ...credits.map((item) => ({
            date: item.date,
            type: "Credit",
            amount: item.amount_usd,
          })),
          ...payments.map((item) => ({
            date: item.date,
            type: "Payment",
            amount: item.amount_usd,
          })),
          ...sales.map((item) => ({
            date: item.date,
            type: "Sale",
            amount: item.amount_usd,
          })),
          ...withdrawals.map((item) => ({
            date: item.date,
            type: "Withdrawal",
            amount: item.amount_usd,
          })),
        ];

        // Group by date
        const groupedData = combinedData.reduce((acc, item) => {
          const date = item.date;
          if (!acc[date])
            acc[date] = { date, Credit: 0, Payment: 0, Sale: 0, Withdrawal: 0 };
          acc[date][item.type] += item.amount;
          return acc;
        }, {});

        // Convert to array
        setData(Object.values(groupedData));
      }
    }

    fetchTransactions();
  }, []);

  return (
    <>
      test
      <ResponsiveContainer width="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Credit" stroke="#82ca9d" />
          <Line type="monotone" dataKey="Payment" stroke="#8884d8" />
          <Line type="monotone" dataKey="Sale" stroke="#ffc658" />
          <Line
            type="monotone"
            dataKey="Withdrawal"
            name="Daniel"
            stroke="#ff7300"
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
};

export default LineChartComponent;

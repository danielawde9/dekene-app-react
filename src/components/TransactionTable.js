import React, { useEffect, useState } from "react";
import { Table } from "antd";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "../utils/formatNumber";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TransactionTable = () => {
  const [transactions, setTransactions] = useState([]);
  const [openingBalance, setOpeningBalance] = useState({ usd: 0, lbp: 0 });

  useEffect(() => {
    async function fetchTransactions() {
      const { data: dailyBalances, error: dailyBalanceError } = await supabase
        .from("dailybalances")
        .select("*")
        .order("date", { ascending: true });

      if (dailyBalanceError) {
        console.error("Error fetching daily balances:", dailyBalanceError);
        return;
      }

      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("*");
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("*");

      if (paymentError || withdrawalsError) {
        console.error(
          "Error fetching transactions:",
          paymentError || withdrawalsError
        );
        return;
      }

      const transactions = [
        ...payments.map((item) => ({ ...item, type: "Payment" })),
        ...withdrawals.map((item) => ({ ...item, type: "Withdrawal" })),
      ];

      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      setOpeningBalance({
        usd: dailyBalances[0].opening_usd,
        lbp: dailyBalances[0].opening_lbp,
      });

      setTransactions(transactions);
    }

    fetchTransactions();
  }, []);

  const calculateBalance = (transactions) => {
    let balanceUSD = openingBalance.usd;
    let balanceLBP = openingBalance.lbp;

    return transactions.map((transaction) => {
      const { amount_usd = 0, amount_lbp = 0, type } = transaction;

      if (type === "Payment") {
        balanceUSD -= amount_usd;
        balanceLBP -= amount_lbp;
      } else if (type === "Withdrawal") {
        balanceUSD += amount_usd;
        balanceLBP += amount_lbp;
      }

      return {
        ...transaction,
        balance_usd: balanceUSD,
        balance_lbp: balanceLBP,
      };
    });
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Amount USD",
      dataIndex: "amount_usd",
      key: "amount_usd",
      render: (text) => formatNumber(text),
    },
    {
      title: "Amount LBP",
      dataIndex: "amount_lbp",
      key: "amount_lbp",
      render: (text) => formatNumber(text),
    },
    {
      title: "Balance USD",
      dataIndex: "balance_usd",
      key: "balance_usd",
      render: (text) => formatNumber(text),
    },
    {
      title: "Balance LBP",
      dataIndex: "balance_lbp",
      key: "balance_lbp",
      render: (text) => formatNumber(text),
    },
  ];

  const dataSource = calculateBalance(transactions);

  return <Table dataSource={dataSource} columns={columns} rowKey="id" />;
};

export default TransactionTable;

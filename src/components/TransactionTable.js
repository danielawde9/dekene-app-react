import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, InputNumber } from "antd";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "../utils/formatNumber";
import { ToastContainer, toast } from "react-toastify";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TransactionTable = ({ selectedUser, openingBalance }) => {
  const [transactions, setTransactions] = useState([]);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isWithdrawalModalVisible, setIsWithdrawalModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    async function fetchTransactions() {
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("deduction_source", "withdrawals");
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

  const addTransaction = async (values, type) => {
    try {
      const date = new Date().toISOString().split("T")[0];
      const transaction = {
        ...values,
        date,
        type,
        user_id: selectedUser,
      };

      const { error } = await supabase
        .from(type.toLowerCase() + "s")
        .insert([transaction]);

      if (error) {
        toast.error("Error adding transaction: " + error.message);
      } else {
        setTransactions([transaction, ...transactions]);
        toast.success("Transaction added successfully!");
      }

      form.resetFields();
      setIsPaymentModalVisible(false);
      setIsWithdrawalModalVisible(false);
    } catch (error) {
      toast.error("Error adding transaction: " + error.message);
    }
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
      title: "Withdrawal",
      children: [
        {
          title: "USD",
          dataIndex: "withdrawal_usd",
          key: "withdrawal_usd",
          render: (text, record) =>
            record.type === "Withdrawal"
              ? formatNumber(record.amount_usd)
              : null,
        },
        {
          title: "LBP",
          dataIndex: "withdrawal_lbp",
          key: "withdrawal_lbp",
          render: (text, record) =>
            record.type === "Withdrawal"
              ? formatNumber(record.amount_lbp)
              : null,
        },
      ],
    },
    {
      title: "Payment",
      children: [
        {
          title: "USD",
          dataIndex: "payment_usd",
          key: "payment_usd",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_usd) : null,
        },
        {
          title: "LBP",
          dataIndex: "payment_lbp",
          key: "payment_lbp",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_lbp) : null,
        },
      ],
    },
    {
      title: "Balance",
      children: [
        {
          title: "USD",
          dataIndex: "balance_usd",
          key: "balance_usd",
          render: (text) => formatNumber(text),
        },
        {
          title: "LBP",
          dataIndex: "balance_lbp",
          key: "balance_lbp",
          render: (text) => formatNumber(text),
        },
      ],
    },
  ];

  const dataSource = calculateBalance(transactions);

  return (
    <>
      <ToastContainer />
      <Button
        type="primary"
        onClick={() => setIsPaymentModalVisible(true)}
        style={{ marginRight: 16 }}
      >
        Add Payment
      </Button>
      <Button type="primary" onClick={() => setIsWithdrawalModalVisible(true)}>
        Add Withdrawal
      </Button>

      <Table
        scroll={{ x: true }}
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
      />

      <Modal
        title="Add Payment"
        open={isPaymentModalVisible}
        onCancel={() => setIsPaymentModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={(values) =>
            addTransaction(
              { ...values, deduction_source: "withdrawals" },
              "Payment"
            )
          }
        >
          <Form.Item
            name="amount_usd"
            label="Amount USD"
            rules={[{ required: true, message: "Please input amount in USD!" }]}
          >
            <InputNumber
              formatter={(value) => formatNumber(value)}
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="amount_lbp"
            label="Amount LBP"
            rules={[{ required: true, message: "Please input amount in LBP!" }]}
          >
            <InputNumber
              formatter={(value) => formatNumber(value)}
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="reference_number"
            label="Reference Number"
            rules={[
              { required: true, message: "Please input the reference number!" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="cause"
            label="Cause"
            rules={[{ required: true, message: "Please input the cause!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Payment
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Withdrawal"
        open={isWithdrawalModalVisible}
        onCancel={() => setIsWithdrawalModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={(values) => addTransaction(values, "Withdrawal")}
        >
          <Form.Item
            name="amount_usd"
            label="Amount USD"
            rules={[{ required: true, message: "Please input amount in USD!" }]}
          >
            <InputNumber
              formatter={(value) => formatNumber(value)}
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="amount_lbp"
            label="Amount LBP"
            rules={[{ required: true, message: "Please input amount in LBP!" }]}
          >
            <InputNumber
              formatter={(value) => formatNumber(value)}
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Withdrawal
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TransactionTable;

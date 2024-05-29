import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
} from "antd";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "../utils/formatNumber";
import { ToastContainer, toast } from "react-toastify";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { Option } = Select;

const TransactionTable = ({ adminUserId, openingBalance }) => {
  const [transactions, setTransactions] = useState([]);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [dailyBalances, setDailyBalances] = useState([]);
  const [form] = Form.useForm();
  const [balance, setBalance] = useState({ usd: 0, lbp: 0 });

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

      // Calculate balance
      const totalWithdrawalsUSD = withdrawals.reduce(
        (acc, item) => acc + item.amount_usd,
        0
      );
      const totalWithdrawalsLBP = withdrawals.reduce(
        (acc, item) => acc + item.amount_lbp,
        0
      );
      const totalPaymentsUSD = payments.reduce(
        (acc, item) => acc + item.amount_usd,
        0
      );
      const totalPaymentsLBP = payments.reduce(
        (acc, item) => acc + item.amount_lbp,
        0
      );

      setBalance({
        usd: totalWithdrawalsUSD - totalPaymentsUSD,
        lbp: totalWithdrawalsLBP - totalPaymentsLBP,
      });
    }

    async function fetchDailyBalances() {
      const { data, error } = await supabase.from("dailybalances").select("*");
      if (error) {
        toast.error("Error fetching daily balances: " + error.message);
      } else {
        setDailyBalances(data);
      }
    }

    fetchTransactions();
    fetchDailyBalances();
  }, []);

  const addTransaction = async (values, type) => {
    try {
      const transaction = {
        ...values,
        date: values.date,
        type,
        user_id: adminUserId,
      };

      const { error } = await supabase
        .from(type.toLowerCase() + "s")
        .insert([transaction]);

      if (error) {
        toast.error("Error adding transaction: " + error.message);
      } else {
        setTransactions([transaction, ...transactions]);
        toast.success("Transaction added successfully!");
        // Recalculate balance
        if (type === "Payment" && values.deduction_source === "withdrawals") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd - values.amount_usd,
            lbp: prevBalance.lbp - values.amount_lbp,
          }));
        } else if (type === "Withdrawal") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd + values.amount_usd,
            lbp: prevBalance.lbp + values.amount_lbp,
          }));
        }
      }

      form.resetFields();
      setIsPaymentModalVisible(false);
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
          dataIndex: "amount_usd",
          key: "withdrawal_usd",
          render: (text, record) =>
            record.type === "Withdrawal"
              ? formatNumber(record.amount_usd)
              : null,
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
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
          dataIndex: "amount_usd",
          key: "payment_usd",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_usd) : null,
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
          key: "payment_lbp",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_lbp) : null,
        },
      ],
    },
  ];

  return (
    <>
      <ToastContainer />
      <Button
        type="primary"
        onClick={() => setIsPaymentModalVisible(true)}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Add Payment
      </Button>

      <Table
        scroll={{ x: true }}
        dataSource={transactions}
        columns={columns}
        rowKey="id"
      />

      <Card title="Current Balance">
        <p>USD: {formatNumber(balance.usd)}</p>
        <p>LBP: {formatNumber(balance.lbp)}</p>
      </Card>

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
            name="date"
            label="Date"
            rules={[{ required: true, message: "Please select a date!" }]}
          >
            <Select>
              {dailyBalances.map((balance) => (
                <Option key={balance.id} value={balance.date}>
                  {balance.date}
                </Option>
              ))}
            </Select>
          </Form.Item>
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
    </>
  );
};

export default TransactionTable;

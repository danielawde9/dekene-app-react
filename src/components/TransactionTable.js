import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  Card,
  Typography,
  Input,
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
  const [isConvertModalVisible, setIsConvertModalVisible] = useState(false);
  const [dailyBalances, setDailyBalances] = useState([]);
  const [form] = Form.useForm();
  const [convertForm] = Form.useForm();
  const [balance, setBalance] = useState({ usd: 0, lbp: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(90000); // Default exchange rate
  const [conversionType, setConversionType] = useState("usd_to_lbp"); // Default conversion type
  const [convertedAmount, setConvertedAmount] = useState(null);

  useEffect(() => {
    fetchTransactions();
    fetchDailyBalances();
  }, []);

  const fetchTransactions = async () => {
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("deduction_source", "daniel");
    const { data: withdrawals, error: danielError } = await supabase
      .from("daniel")
      .select("*");
    const { data: conversions, error: conversionError } = await supabase
      .from("conversions")
      .select("*");

    if (paymentError || danielError || conversionError) {
      console.error(
        "Error fetching transactions:",
        paymentError || danielError || conversionError
      );
      return;
    }

    const transactions = [
      ...payments.map((item) => ({ ...item, type: "Payment" })),
      ...withdrawals.map((item) => ({ ...item, type: "Withdrawal" })),
      ...conversions.map((item) => ({ ...item, type: "Conversion" })),
    ];

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    setTransactions(transactions);

    // Calculate balance
    const totalDanielUSD = withdrawals.reduce(
      (acc, item) => acc + item.amount_usd,
      0
    );
    const totalDanielLBP = withdrawals.reduce(
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
    const totalConversionsUSD = conversions.reduce(
      (acc, item) => acc + (item.original_currency === "USD" ? -item.amount_usd : item.amount_usd),
      0
    );
    const totalConversionsLBP = conversions.reduce(
      (acc, item) => acc + (item.original_currency === "LBP" ? -item.amount_lbp : item.amount_lbp),
      0
    );

    setBalance({
      usd: totalDanielUSD - totalPaymentsUSD + totalConversionsUSD,
      lbp: totalDanielLBP - totalPaymentsLBP + totalConversionsLBP,
    });

    setIsLoading(false);
  };

  const fetchDailyBalances = async () => {
    const { data, error } = await supabase.from("dailybalances").select("*");
    if (error) {
      toast.error("Error fetching daily balances: " + error.message);
    } else {
      setDailyBalances(data);
    }
  };

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
        if (type === "Payment" && values.deduction_source === "daniel") {
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
      setIsConvertModalVisible(false);
      setConvertedAmount(null);
    } catch (error) {
      toast.error("Error adding transaction: " + error.message);
    }
  };

  const handleDelete = async (record) => {
    const { type, id, amount_usd, amount_lbp } = record;
    try {
      const { error } = await supabase.from(type.toLowerCase() + "s").delete().eq("id", id);

      if (error) {
        toast.error("Error deleting transaction: " + error.message);
      } else {
        setTransactions(transactions.filter((transaction) => transaction.id !== id));
        toast.success("Transaction deleted successfully!");
        // Recalculate balance
        if (type === "Payment" && record.deduction_source === "daniel") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd + amount_usd,
            lbp: prevBalance.lbp + amount_lbp,
          }));
        } else if (type === "Withdrawal") {
          setBalance((prevBalance) => ({
            usd: prevBalance.usd - amount_usd,
            lbp: prevBalance.lbp - amount_lbp,
          }));
        }
      }
    } catch (error) {
      toast.error("Error deleting transaction: " + error.message);
    }
  };

  const handleConvert = async (values) => {
    const convertedTransaction =
      conversionType === "usd_to_lbp"
        ? {
          date: values.date,
          amount_usd: values.amount_usd,
          amount_lbp: values.amount_usd * exchangeRate,
          exchange_rate: exchangeRate,
          type: "Conversion",
          user_id: adminUserId,
          original_currency: "USD",
          converted_currency: "LBP",
        }
        : {
          date: values.date,
          amount_usd: values.amount_lbp / exchangeRate,
          amount_lbp: values.amount_lbp,
          type: "Conversion",
          exchange_rate: exchangeRate,
          user_id: adminUserId,
          original_currency: "LBP",
          converted_currency: "USD",
        };

    try {
      const { error } = await supabase.from("conversions").insert([convertedTransaction]);

      if (error) {
        toast.error("Error adding conversion: " + error.message);
      } else {
        setTransactions([convertedTransaction, ...transactions]);
        toast.success("Conversion added successfully!");
        setConvertedAmount(null);
        setIsConvertModalVisible(false);
        convertForm.resetFields();
        fetchTransactions();
      }
    } catch (error) {
      toast.error("Error adding conversion: " + error.message);
    }
  };

  const handleAmountChange = (value) => {
    if (conversionType === "usd_to_lbp") {
      setConvertedAmount(value * exchangeRate);
    } else {
      setConvertedAmount(value / exchangeRate);
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      align: "center",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      align: "center",
    },
    {
      title: "Original Currency",
      dataIndex: "original_currency",
      key: "original_currency",
      align: "center",
    },
    {
      title: "Converted Currency",
      dataIndex: "converted_currency",
      key: "converted_currency",
      align: "center",
    },
    {
      title: "Daniel",
      children: [
        {
          title: "USD",
          dataIndex: "amount_usd",
          key: "withdrawal_usd",
          render: (text, record) =>
            record.type === "Withdrawal" || record.type === "Conversion"
              ? formatNumber(record.amount_usd)
              : null,
          align: "center",
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
          key: "withdrawal_lbp",
          render: (text, record) =>
            record.type === "Withdrawal" || record.type === "Conversion"
              ? formatNumber(record.amount_lbp)
              : null,
          align: "center",
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
          align: "center",
        },
        {
          title: "LBP",
          dataIndex: "amount_lbp",
          key: "payment_lbp",
          render: (text, record) =>
            record.type === "Payment" ? formatNumber(record.amount_lbp) : null,
          align: "center",
        },
      ],
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (text, record) => (
        <Button type="link" onClick={() => handleDelete(record)}>
          Delete
        </Button>
      ),
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
      <Button
        type="default"
        onClick={() => {
          setConversionType("usd_to_lbp");
          setIsConvertModalVisible(true);
        }}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Convert USD to LBP
      </Button>
      <Button
        type="default"
        onClick={() => {
          setConversionType("lbp_to_usd");
          setIsConvertModalVisible(true);
        }}
        style={{ marginRight: 16, marginBottom: 20 }}
      >
        Convert LBP to USD
      </Button>

      <Table
        loading={isLoading}
        scroll={{ x: true }}
        dataSource={transactions}
        columns={columns}
        rowKey="id"
      />

      <Card title="Current Balance" style={{ marginTop: 20 }}>
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
            addTransaction({ ...values, deduction_source: "daniel" }, "Payment")
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

      <Modal
        title={
          conversionType === "usd_to_lbp"
            ? "Convert USD to LBP and Select Date"
            : "Convert LBP to USD and Select Date"
        }
        open={isConvertModalVisible}
        onCancel={() => setIsConvertModalVisible(false)}
        footer={null}
      >
        <Form form={convertForm} onFinish={handleConvert}>
          {conversionType === "usd_to_lbp" ? (
            <Form.Item
              name="amount_usd"
              label="Amount USD"
              rules={[
                { required: true, message: "Please input amount in USD!" },
              ]}
            >
              <InputNumber
                formatter={(value) => formatNumber(value)}
                parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                style={{ width: "100%" }}
                onChange={handleAmountChange}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="amount_lbp"
              label="Amount LBP"
              rules={[
                { required: true, message: "Please input amount in LBP!" },
              ]}
            >
              <InputNumber
                formatter={(value) => formatNumber(value)}
                parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                style={{ width: "100%" }}
                onChange={handleAmountChange}
              />
            </Form.Item>
          )}
          <Form.Item
            name="exchange_rate"
            label="Exchange Rate"
            rules={[{ required: true, message: "Please input exchange rate!" }]}
          >
            <InputNumber
              defaultValue={exchangeRate}
              onChange={(value) => setExchangeRate(value)}
              formatter={(value) => formatNumber(value)}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Typography.Title level={5} style={{ marginBottom: 20 }}>
            {conversionType === "usd_to_lbp"
              ? `Converted Amount: ${formatNumber(convertedAmount)} LBP`
              : `Converted Amount: ${formatNumber(convertedAmount)} USD`}
          </Typography.Title>
          <Form.Item
            name="date"
            label="Select Conversion Date"
            rules={[
              { required: true, message: "Please select a conversion date!" },
            ]}
          >
            <Select>
              {dailyBalances.map((balance) => (
                <Option key={balance.id} value={balance.date}>
                  {balance.date}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {conversionType === "usd_to_lbp"
                ? "Convert and Add"
                : "Convert and Add"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TransactionTable;

import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Form,
  Popconfirm,
  Select,
} from "antd";
import { formatNumber } from "../utils/formatNumber";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-toastify";

const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const columns = (handleDelete, handlePay) => [
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
    title: "Person",
    dataIndex: "person",
    key: "person",
  },
  {
    title: "Paid",
    dataIndex: "is_paid",
    key: "is_paid",
    render: (text) => (text ? "Yes" : "No"),
  },
  {
    title: "Action",
    key: "action",
    render: (text, record) => (
      <>
        <Popconfirm
          title="Sure to delete?"
          onConfirm={() => handleDelete(record)}
        >
          <Button type="link">Delete</Button>
        </Popconfirm>
        {!record.is_paid && (
          <Button type="link" onClick={() => handlePay(record.key)}>
            Pay
          </Button>
        )}
      </>
    ),
  },
];

const Credits = React.memo(
  ({ addCredit, selectedUser, updateClosingBalance }) => {
    const [form] = Form.useForm();
    const [credits, setCredits] = useState([]);
    const [unpaidCredits, setUnpaidCredits] = useState([]);
    const [selectedCredit, setSelectedCredit] = useState(null);

    useEffect(() => {
      const fetchUnpaidCredits = async () => {
        const { data, error } = await supabase
          .from("credits")
          .select("*")
          .eq("is_paid", false);
        if (error) {
          console.error("Error fetching unpaid credits:", error);
        } else {
          setUnpaidCredits(data);
        }
      };

      fetchUnpaidCredits();
    }, []);

    const onFinish = (values) => {
      const key = credits.length ? credits[credits.length - 1].key + 1 : 0;
      const newCredit = {
        ...values,
        key,
        is_paid: false,
        user_id: selectedUser,
      };
      setCredits([...credits, newCredit]);
      addCredit(newCredit);
      form.resetFields();
    };

    const handleDelete = async (record) => {
      try {
        const { error } = await supabase.from("credits").delete().eq("id", record.id);
        if (error) {
          toast.error("Error deleting credit: " + error.message);
        } else {
          setCredits(credits.filter((item) => item.id !== record.id));
          toast.success("Credit deleted successfully!");
        }
      } catch (error) {
        toast.error("Error deleting credit: " + error.message);
      }
    };

    const handlePay = (key) => {
      const updatedCredits = credits.map((credit) =>
        credit.key === key ? { ...credit, is_paid: true } : credit
      );
      setCredits(updatedCredits);
      const paidCredit = credits.find((credit) => credit.key === key);
      updateClosingBalance(paidCredit.amount_usd, paidCredit.amount_lbp);
    };

    const handleSelectCredit = (value) => {
      setSelectedCredit(value);
    };

    const handleAddSelectedCredit = () => {
      const creditToPay = unpaidCredits.find(
        (credit) => credit.id === selectedCredit
      );
      if (creditToPay) {
        const key = credits.length ? credits[credits.length - 1].key + 1 : 0;
        const newCredit = {
          ...creditToPay,
          key,
          is_paid: true,
          user_id: selectedUser,
        };
        setCredits([...credits, newCredit]);
        updateClosingBalance(newCredit.amount_usd, newCredit.amount_lbp);
        setUnpaidCredits(
          unpaidCredits.filter((credit) => credit.id !== selectedCredit)
        );
        setSelectedCredit(null);
      }
    };

    return (
      <Card title="Credits">
        <Form form={form} onFinish={onFinish}>
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
            name="person"
            label="Person"
            rules={[{ required: true, message: "Please input the person!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Credit
            </Button>
          </Form.Item>
        </Form>
        <Card
          title="Unpaid Credits"
          style={{ marginTop: 20, marginBottom: 20 }}
        >
          <Select
            placeholder="Select unpaid credit"
            style={{ width: "100%", marginBottom: 10 }}
            value={selectedCredit}
            onChange={handleSelectCredit}
          >
            {unpaidCredits.map((credit) => (
              <Option key={credit.id} value={credit.id}>
                {credit.person} - {formatNumber(credit.amount_usd)} USD /{" "}
                {formatNumber(credit.amount_lbp)} LBP
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            onClick={handleAddSelectedCredit}
            disabled={!selectedCredit}
          >
            Add Selected Credit
          </Button>
        </Card>
        <Table
          dataSource={credits}
          columns={columns(handleDelete, handlePay)}
          rowKey="id"
        />
      </Card>
    );
  }
);

export default Credits;

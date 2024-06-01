import React, { useState, useEffect } from "react";
import { Modal, Form, InputNumber, Button, Select, DatePicker } from "antd";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "../utils/formatNumber";

const { Option } = Select;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ConvertAndSelectDateModal = ({ visible, onCancel, onConvert }) => {
  const [form] = Form.useForm();
  const [closingDates, setClosingDates] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(90000); // Default exchange rate

  useEffect(() => {
    const fetchClosingDates = async () => {
      const { data, error } = await supabase
        .from("dailybalances")
        .select("date");
      if (error) {
        console.error("Error fetching closing dates:", error);
      } else {
        setClosingDates(data);
      }
    };

    fetchClosingDates();
  }, []);

  const handleFinish = (values) => {
    const convertedValues = {
      ...values,
      amount_lbp: values.amount_usd * exchangeRate,
      exchange_rate: exchangeRate,
    };
    onConvert(convertedValues);
    form.resetFields();
  };

  return (
    <Modal
      visible={visible}
      title="Convert USD to LBP and Select Date"
      onCancel={onCancel}
      footer={null}
    >
      <Form form={form} onFinish={handleFinish}>
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
        <Form.Item
          name="closing_date"
          label="Select Closing Date"
          rules={[{ required: true, message: "Please select a closing date!" }]}
        >
          <Select>
            {closingDates.map((date) => (
              <Option key={date.date} value={date.date}>
                {date.date}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Convert and Add
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ConvertAndSelectDateModal;

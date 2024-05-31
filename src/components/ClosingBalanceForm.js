// ClosingBalanceForm.js
import React from "react";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Flex,
  Form,
  InputNumber,
  Select,
  Typography,
} from "antd";
import { formatNumber } from "../utils/formatNumber";

const { Option } = Select;

const ClosingBalanceForm = ({
  closingBalances,
  setClosingBalances,
  exchangeRate,
  title,
  difference,
  users,
  manualDateEnabled,
  missingDates,
  setSelectedUser,
  setSelectedDate,
  handleSubmit,
}) => {
  const calculateTotalInUSD = (usd, lbp) => usd + lbp / exchangeRate;

  return (
    <Flex vertical justify="center" align="center">
      <Card title={title} style={{ marginTop: 20 }} style={{ maxWidth: 500 }}>
        <Form.Item label="Closing Balance USD">
          <InputNumber
            min={0}
            formatter={(value) => formatNumber(value)}
            value={closingBalances.usd}
            onChange={(value) =>
              setClosingBalances((prev) => ({ ...prev, usd: value }))
            }
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item label="Closing Balance LBP">
          <InputNumber
            min={0}
            formatter={(value) => formatNumber(value)}
            value={closingBalances.lbp}
            onChange={(value) =>
              setClosingBalances((prev) => ({ ...prev, lbp: value }))
            }
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Typography.Text>
          Total in USD:{" "}
          {calculateTotalInUSD(
            closingBalances.usd,
            closingBalances.lbp
          ).toLocaleString()}
        </Typography.Text>

        {difference !== undefined && (
          <p type="danger">Difference: {difference} USD</p>
        )}

        <Divider></Divider>

        <Form>
          <Form.Item
            name="closing_employee"
            label="Select Closing Employee"
            rules={[
              {
                required: true,
                message: "Please select an employee!",
              },
            ]}
          >
            <Select
              placeholder="Select an employee"
              onChange={(value) => setSelectedUser(value)}
            >
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {manualDateEnabled && (
            <Form.Item
              name="closing_date"
              label="Select Closing Date"
              rules={[
                {
                  required: true,
                  message: "Please select a date!",
                },
              ]}
            >
              <DatePicker
                showNow
                format="YYYY-MM-DD"
                disabledDate={(date) =>
                  missingDates.some(
                    (d) =>
                      d.toISOString().split("T")[0] ===
                      date.format("YYYY-MM-DD")
                  )
                }
                onChange={(date) => setSelectedDate(date)}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={difference >= 2}
            >
              Close Today
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
};

export default ClosingBalanceForm;

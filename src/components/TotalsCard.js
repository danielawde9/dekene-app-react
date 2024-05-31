// TotalsCard.js
import React from "react";
import { Card, Form, InputNumber, Typography } from "antd";
import { formatNumber } from "../utils/formatNumber";

const TotalsCard = ({
  title,
  totals,
  exchangeRate,
  setExchangeRate,
  calculateTotalInUSD,
}) => {
  return (
    <Card
      title={title}
      actions={[
        <Typography.Title level={4}>
          Total in USD: {calculateTotalInUSD(totals.usd, totals.lbp)}
        </Typography.Title>,
      ]}
    >
      <p>USD: {totals.usd.toLocaleString()}</p>
      <p>LBP: {totals.lbp.toLocaleString()}</p>
      <Form.Item label="Exchange Rate" style={{ marginTop: "10px" }}>
        <InputNumber
          prefix="LBP"
          formatter={(value) => formatNumber(value)}
          defaultValue={formatNumber(exchangeRate)}
          onChange={(value) => setExchangeRate(value)}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Card>
  );
};

export default TotalsCard;

import React from "react";
import { Card, Typography, Button } from "antd";
import { formatNumber } from "../utils/formatNumber";

const DailyBalance = React.memo(({ openingBalances, onConfirm }) => {
  return (
    <Card
      title="Opening Balance"
      actions={[
        <Button type="primary" onClick={onConfirm}>
          Confirm
        </Button>,
      ]}
    >
      <Typography.Title level={5}>
        Date: {openingBalances.date}
      </Typography.Title>
      <Typography.Title level={5}>
        Closing USD: {formatNumber(openingBalances.usd)}
      </Typography.Title>
      <Typography.Title level={5}>
        Closing LBP: {formatNumber(openingBalances.lbp)}
      </Typography.Title>

      <Typography.Text>
        Please ensure that the amount of money currently available matches the
        amount displayed. If they match, kindly click "confirm" to continue.
      </Typography.Text>
    </Card>
  );
});

export default DailyBalance;

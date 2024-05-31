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
    </Card>
  );
});

export default DailyBalance;

// src/components/DailyBalance.js
import React from 'react';
import { Card } from 'antd';

function DailyBalance({ date, openingBalances }) {
    return (
        <Card title="Daily Balance">
            <p>Date: {date.toLocaleDateString()}</p>
            <p>Opening USD: {openingBalances.usd}</p>
            <p>Opening LBP: {openingBalances.lbp}</p>
        </Card>
    );
}

export default DailyBalance;

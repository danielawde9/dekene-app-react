// src/components/DailyBalance.js
import React from 'react';
import { Card } from 'antd';
import { formatNumber } from '../utils/formatNumber';

function DailyBalance({ openingBalances }) {
    return (
        <Card title="Opening Balance">
            <p>Date: {openingBalances.date}</p>
            <p>Opening USD: {formatNumber(openingBalances.usd)}</p>
            <p>Opening LBP: {formatNumber(openingBalances.lbp)}</p>
        </Card>
    );
}

export default DailyBalance;

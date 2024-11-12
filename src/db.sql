-- Table: branches
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL
);

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL
);

-- Table: dailybalances
CREATE TABLE dailybalances (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL,
    closing_lbp NUMERIC NOT NULL,
    closing_usd NUMERIC NOT NULL,
    date DATE NOT NULL UNIQUE,
    opening_lbp NUMERIC NOT NULL,
    opening_usd NUMERIC NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: conversions
CREATE TABLE conversions (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    converted_currency VARCHAR NOT NULL,
    date DATE NOT NULL,
    exchange_rate NUMERIC NOT NULL,
    original_currency VARCHAR NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: credits
CREATE TABLE credits (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    date DATE NOT NULL,
    key INT,
    person VARCHAR NOT NULL,
    remaining_amount_lbp NUMERIC,
    remaining_amount_usd NUMERIC,
    status BOOLEAN DEFAULT TRUE,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id),
    paid_amount_usd NUMERIC DEFAULT 0,
    paid_amount_lbp NUMERIC DEFAULT 0
);


-- Table: daniel
CREATE TABLE daniel (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    date DATE NOT NULL,
    key INT,
    type VARCHAR,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    cause VARCHAR NOT NULL,
    date DATE NOT NULL,
    deduction_source VARCHAR,
    key INT,
    reference_number VARCHAR,
    type VARCHAR,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: sales
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    date DATE NOT NULL,
    key INT,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: settings
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    manual_date_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE closing_differences (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  user_id INTEGER REFERENCES users(id),
  difference_usd NUMERIC NOT NULL,
  difference_lbp NUMERIC NOT NULL
);

CREATE TABLE opening_differences (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  user_id INTEGER REFERENCES users(id),
  difference_usd NUMERIC NOT NULL,
  difference_lbp NUMERIC NOT NULL
);

-- Table: debits
CREATE TABLE debits (
    id SERIAL PRIMARY KEY,
    amount_lbp NUMERIC NOT NULL,
    amount_usd NUMERIC NOT NULL,
    branch_id INT NOT NULL,
    date DATE NOT NULL,
    description VARCHAR,
    user_id INT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (date) REFERENCES dailybalances(date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

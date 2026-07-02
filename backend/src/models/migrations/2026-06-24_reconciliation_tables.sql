USE forecastai_v3;

CREATE TABLE IF NOT EXISTS po_discrepancies (
    discrepancy_id INT PRIMARY KEY AUTO_INCREMENT,
    po_item_id INT NOT NULL,
    po_id INT NOT NULL,
    expected_quantity INT NOT NULL,
    actual_quantity INT NOT NULL,
    discrepancy_quantity INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    evidence_url TEXT NULL,
    status ENUM('Pending', 'Resolved', 'Rejected') DEFAULT 'Pending',
    reported_by INT NOT NULL,
    resolved_by INT NULL,
    resolution_note TEXT,
    resolution_type VARCHAR(50) NULL,
    compensation_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_discrepancies_item FOREIGN KEY (po_item_id) REFERENCES po_items(po_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_po_discrepancies_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    CONSTRAINT fk_po_discrepancies_reporter FOREIGN KEY (reported_by) REFERENCES users(user_id),
    CONSTRAINT fk_po_discrepancies_resolver FOREIGN KEY (resolved_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    adjustment_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    adjustment_type ENUM('Deduction', 'Addition') DEFAULT 'Deduction',
    quantity INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    evidence_url TEXT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    reported_by INT NOT NULL,
    resolved_by INT NULL,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_adjustments_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_reporter FOREIGN KEY (reported_by) REFERENCES users(user_id),
    CONSTRAINT fk_inventory_adjustments_resolver FOREIGN KEY (resolved_by) REFERENCES users(user_id)
);

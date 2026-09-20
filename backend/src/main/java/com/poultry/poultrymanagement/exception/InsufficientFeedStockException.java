package com.poultry.poultrymanagement.exception;

public class InsufficientFeedStockException extends RuntimeException {
    public InsufficientFeedStockException(String message) {
        super(message);
    }
}

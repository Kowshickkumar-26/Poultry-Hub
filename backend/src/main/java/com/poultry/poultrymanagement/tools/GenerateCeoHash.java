package com.poultry.poultrymanagement.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

// TEMPORARY utility -- run this once to get a real BCrypt hash for your
// seed CEO account, then DELETE this file. It is not part of the app.
//
// How to run: right-click this file in VS Code -> Run Java, or
// java -cp target/classes com.poultry.poultrymanagement.GenerateCeoHash
public class GenerateCeoHash {
    public static void main(String[] args) {
        String plainPassword = ""; // change this before running
        String hash = new BCryptPasswordEncoder().encode(plainPassword);
        System.out.println("Copy this hash into your INSERT statement:");
        System.out.println(hash);
    }
}

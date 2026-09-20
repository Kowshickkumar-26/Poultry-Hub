package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileUpdateRequest {

    @NotBlank(message = "Farmer name cannot be empty")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Pattern(
        regexp = "^$|^[+0-9\\s\\-()]{7,20}$",
        message = "Please enter a valid phone number (7-20 digits/characters)"
    )
    private String phone;

    @NotBlank(message = "Farm name cannot be empty")
    @Size(max = 150, message = "Farm name must not exceed 150 characters")
    private String farmName;

    @Size(max = 255, message = "Farm location must not exceed 255 characters")
    private String farmLocation;

    private String farmDescription;
}

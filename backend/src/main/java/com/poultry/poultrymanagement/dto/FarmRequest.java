package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FarmRequest {

    @NotBlank(message = "Farm name is required")
    private String name;

    private String location;

    private String description;
}

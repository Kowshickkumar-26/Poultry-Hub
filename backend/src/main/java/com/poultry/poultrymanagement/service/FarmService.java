package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.FarmRequest;
import com.poultry.poultrymanagement.dto.FarmResponse;
import com.poultry.poultrymanagement.entity.Farm;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.FarmRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FarmService {

    private final FarmRepository farmRepository;
    private final UserRepository userRepository;
    private final FarmerRepository farmerRepository;

    @Transactional
    public FarmResponse createFarm(FarmRequest request) {
        Farm farm = Farm.builder()
                .name(request.getName().trim())
                .location(request.getLocation() != null ? request.getLocation().trim() : null)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .build();
        return toResponse(farmRepository.save(farm));
    }

    // Farmer creates their own farm and auto-links their farmer profile
    @Transactional
    public FarmResponse createFarmAndLinkFarmer(FarmRequest request, Long loggedInUserId) {
        User user = userRepository.findById(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + loggedInUserId));

        if (user.getRole() != Role.FARMER) {
            throw new IllegalArgumentException("Only FARMER role can create their own farm");
        }

        // Check if farmer already has a farmer profile
        Farmer existingFarmer = farmerRepository.findByUserId(loggedInUserId).orElse(null);
        if (existingFarmer != null) {
            throw new IllegalStateException("This user already has a farmer profile linked to a farm");
        }

        // Create the farm
        Farm farm = Farm.builder()
                .name(request.getName().trim())
                .location(request.getLocation() != null ? request.getLocation().trim() : null)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .build();
        Farm savedFarm = farmRepository.save(farm);

        // Create farmer profile and link to the farm
        Farmer farmer = Farmer.builder()
                .user(user)
                .farm(savedFarm)
                .joinedDate(LocalDate.now())
                .build();
        farmerRepository.save(farmer);

        return toResponse(savedFarm);
    }

    @Transactional
    public void createDefaultFarmForNewFarmer(User user) {
        if (user.getRole() != Role.FARMER) {
            return;
        }

        if (farmerRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }

        String farmName = user.getName() + "'s Farm";
        Farm farm = Farm.builder()
                .name(farmName)
                .location(null)
                .description(null)
                .build();
        Farm savedFarm = farmRepository.save(farm);

        Farmer farmer = Farmer.builder()
                .user(user)
                .farm(savedFarm)
                .joinedDate(LocalDate.now())
                .build();

        farmerRepository.save(farmer);
    }

    @Transactional(readOnly = true)
    public List<FarmResponse> getAllFarms() {
        return farmRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FarmResponse getFarmById(Long id, Long loggedInUserId, Role role) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Farm not found: " + id));

        if (role == Role.FARMER) {
            Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                    .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));
            if (farmer.getFarm() == null || !farm.getId().equals(farmer.getFarm().getId())) {
                throw new AccessDeniedException("This farm does not belong to the logged-in farmer");
            }
        }
        return toResponse(farm);
    }

    @Transactional(readOnly = true)
    public FarmResponse getMyFarm(Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Farm farm = farmer.getFarm();
        if (farm == null) {
            throw new EntityNotFoundException("No farm associated with this farmer profile");
        }
        return toResponse(farm);
    }

    @Transactional
    public FarmResponse updateMyFarm(Long loggedInUserId, FarmRequest request) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Farm farm = farmer.getFarm();
        if (farm == null) {
            throw new EntityNotFoundException("No farm associated with this farmer profile");
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            farm.setName(request.getName().trim());
        }
        if (request.getLocation() != null) {
            String trimmedLoc = request.getLocation().trim();
            farm.setLocation(trimmedLoc.isEmpty() ? null : trimmedLoc);
        }
        if (request.getDescription() != null) {
            String trimmedDesc = request.getDescription().trim();
            farm.setDescription(trimmedDesc.isEmpty() ? null : trimmedDesc);
        }

        return toResponse(farmRepository.save(farm));
    }

    private FarmResponse toResponse(Farm farm) {
        String ownerName = farmerRepository.findByFarmId(farm.getId()).stream()
                .findFirst()
                .map(f -> f.getUser().getName())
                .orElse(null);

        return FarmResponse.builder()
                .id(farm.getId())
                .name(farm.getName())
                .location(farm.getLocation())
                .description(farm.getDescription())
                .ownerName(ownerName)
                .createdAt(farm.getCreatedAt())
                .build();
    }
}

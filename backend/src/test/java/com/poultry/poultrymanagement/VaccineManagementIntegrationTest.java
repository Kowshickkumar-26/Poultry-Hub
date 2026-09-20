package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.exception.BatchCompletedException;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.VaccineRepository;
import com.poultry.poultrymanagement.service.BatchService;
import com.poultry.poultrymanagement.service.VaccineService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class VaccineManagementIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private VaccineService vaccineService;

    @Autowired
    private VaccineRepository vaccineRepository;

    @Autowired
    private com.poultry.poultrymanagement.service.SaleService saleService;

    private Long createFarmer(String namePrefix) {
        String email = namePrefix.toLowerCase() + "-" + System.nanoTime() + "@test.com";
        RegisterRequest req = RegisterRequest.builder()
                .name(namePrefix)
                .email(email)
                .password("password123")
                .role(Role.FARMER)
                .phone("9998887777")
                .build();
        ResponseEntity<AuthResponse> res = authController.register(req);
        return res.getBody().getUserId();
    }

    @Test
    @Transactional
    @DisplayName("End-to-End Vaccine Management: Creation, Auto-Date, Age, Persistence, Validation, Security & Completed Batch Rejection")
    void testVaccineManagementComprehensive() {
        Long user1Id = createFarmer("FarmerVaccine1");
        var farmer1 = farmerRepository.findByUserId(user1Id).orElseThrow();

        // 1. Create Active Batch (5000 birds)
        BatchRequest batchReq1 = BatchRequest.builder()
                .farmId(farmer1.getFarm().getId())
                .initialBirds(5000)
                .build();
        BatchResponse batch1 = batchService.createBatch(batchReq1, user1Id);
        Long batch1Id = batch1.getId();

        // 2. Initial state: No vaccines
        List<VaccineResponse> initialList = vaccineService.getVaccines(batch1Id, user1Id, Role.FARMER);
        assertThat(initialList).isEmpty();

        // 3. Add Vaccine 1 (Auto date defaulted to today)
        VaccineRequest v1 = VaccineRequest.builder()
                .vaccineName("Newcastle (NDV-Lasota)")
                .remarks("First routine dose administered via drinking water")
                .build();
        VaccineResponse res1 = vaccineService.addVaccine(batch1Id, v1, user1Id);
        assertThat(res1.getId()).isNotNull();
        assertThat(res1.getBatchId()).isEqualTo(batch1Id);
        assertThat(res1.getVaccineName()).isEqualTo("Newcastle (NDV-Lasota)");
        assertThat(res1.getGivenDate()).isEqualTo(LocalDate.now());
        assertThat(res1.getAgeDays()).isGreaterThanOrEqualTo(1);
        assertThat(res1.getRemarks()).isEqualTo("First routine dose administered via drinking water");

        // Verify direct persistence in MySQL repository
        assertThat(vaccineRepository.findById(res1.getId())).isPresent();

        // 4. Add Vaccine 2 (Specific date and scheduled remark)
        VaccineRequest v2 = VaccineRequest.builder()
                .givenDate(LocalDate.now())
                .vaccineName("IBD (Gumboro)")
                .remarks("Second vaccination booster")
                .build();
        VaccineResponse res2 = vaccineService.addVaccine(batch1Id, v2, user1Id);
        assertThat(res2.getId()).isNotNull();
        assertThat(res2.getVaccineName()).isEqualTo("IBD (Gumboro)");

        // 5. Query list: Both vaccines appear
        List<VaccineResponse> listAfterAdd = vaccineService.getVaccines(batch1Id, user1Id, Role.FARMER);
        assertThat(listAfterAdd).hasSize(2);
        assertThat(listAfterAdd.get(0).getVaccineName()).isEqualTo("Newcastle (NDV-Lasota)");
        assertThat(listAfterAdd.get(1).getVaccineName()).isEqualTo("IBD (Gumboro)");

        // 6. Validation: Blank vaccine name should be rejected
        VaccineRequest invalidNameReq = VaccineRequest.builder()
                .vaccineName("   ")
                .build();
        assertThatThrownBy(() -> vaccineService.addVaccine(batch1Id, invalidNameReq, user1Id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Vaccine name is required");

        // 7. Validation: Date before batch start date should be rejected
        VaccineRequest pastDateReq = VaccineRequest.builder()
                .vaccineName("Marek's Disease")
                .givenDate(batch1.getStartDate().minusDays(5))
                .build();
        assertThatThrownBy(() -> vaccineService.addVaccine(batch1Id, pastDateReq, user1Id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Vaccine date cannot be before the batch start date");

        // 8. Security / IDOR: Farmer 2 cannot add or view Farmer 1's vaccines
        Long user2Id = createFarmer("FarmerVaccine2");
        assertThatThrownBy(() -> vaccineService.getVaccines(batch1Id, user2Id, Role.FARMER))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> vaccineService.addVaccine(batch1Id, v1, user2Id))
                .isInstanceOf(AccessDeniedException.class);

        // 9. Completed Batch Rejection (HTTP 409) - Sell 5000 birds first to reach 0 remaining
        saleService.addSale(batch1Id, SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Vaccine Test Trader")
                .birdsSold(5000)
                .totalWeightKg(java.math.BigDecimal.valueOf(10000))
                .ratePerKg(java.math.BigDecimal.valueOf(2.50))
                .build(), user1Id);

        batchService.endBatch(batch1Id, user1Id);

        VaccineRequest postEndVaccine = VaccineRequest.builder()
                .vaccineName("Fowl Pox")
                .build();
        assertThatThrownBy(() -> vaccineService.addVaccine(batch1Id, postEndVaccine, user1Id))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add vaccines. This batch is already completed.");

        // Read still works on completed batch
        List<VaccineResponse> readAfterEnd = vaccineService.getVaccines(batch1Id, user1Id, Role.FARMER);
        assertThat(readAfterEnd).hasSize(2);
    }
}

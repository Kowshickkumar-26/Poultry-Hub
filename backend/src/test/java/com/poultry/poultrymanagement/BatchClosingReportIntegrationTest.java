package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.controller.BatchController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.ExpenseCategory;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.exception.BatchNotEligibleForClosingReportException;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.UserRepository;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.*;
import com.poultry.poultrymanagement.service.report.BatchClosingReportPdfService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class BatchClosingReportIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private DailyRecordService dailyRecordService;

    @Autowired
    private FeedLoadService feedLoadService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private VaccineService vaccineService;

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private RemarkService remarkService;

    @Autowired
    private BatchClosingReportPdfService batchClosingReportPdfService;

    @Autowired
    private BatchController batchController;

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
        return Objects.requireNonNull(res.getBody()).getUserId();
    }

    private Long getOrCreateCeo() {
        return userRepository.findByEmail("ceo@poultry.local")
                .map(User::getId)
                .orElseGet(() -> {
                    User ceo = User.builder()
                            .name("Chief Executive")
                            .email("ceo-test-" + System.nanoTime() + "@test.com")
                            .passwordHash("password123")
                            .role(Role.CEO)
                            .phone("1112223333")
                            .isActive(true)
                            .build();
                    return userRepository.save(ceo).getId();
                });
    }

    @Test
    @Transactional
    @DisplayName("End-to-End Batch Closing Report PDF Generation, Validations, Security & Content-Disposition")
    void testBatchClosingReportPdfComprehensive() {
        Long farmer1UserId = createFarmer("FarmerReport1");
        Long farmer2UserId = createFarmer("FarmerReport2");
        Long ceoUserId = getOrCreateCeo();

        var farmer1 = farmerRepository.findByUserId(farmer1UserId).orElseThrow();
        User farmer1User = userRepository.findById(farmer1UserId).orElseThrow();
        UserPrincipal farmer1Principal = new UserPrincipal(farmer1User);

        User farmer2User = userRepository.findById(farmer2UserId).orElseThrow();
        UserPrincipal farmer2Principal = new UserPrincipal(farmer2User);

        User ceoUser = userRepository.findById(ceoUserId).orElseThrow();
        UserPrincipal ceoPrincipal = new UserPrincipal(ceoUser);

        // 1. Create Active Batch with 3,000 birds
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmer1.getFarm().getId())
                .initialBirds(3000)
                .build();
        BatchResponse batch = batchService.createBatch(batchReq, farmer1UserId);
        Long batchId = batch.getId();

        // 2. Load Feed (50kg starter & 70kg finisher)
        FeedLoadRequest fl1 = FeedLoadRequest.builder()
                .feedType("Starter")
                .weightPerBagKg(BigDecimal.valueOf(50))
                .bags(BigDecimal.valueOf(40))
                .build();
        feedLoadService.addFeedLoad(batchId, fl1, farmer1UserId);

        FeedLoadRequest fl2 = FeedLoadRequest.builder()
                .feedType("Finisher")
                .weightPerBagKg(BigDecimal.valueOf(70))
                .bags(BigDecimal.valueOf(50))
                .build();
        feedLoadService.addFeedLoad(batchId, fl2, farmer1UserId);

        // 3. Add Daily Records
        DailyRecordRequest dr1 = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(12)
                .morningMortality(4)
                .feedType("Starter")
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .avgWeightG(BigDecimal.valueOf(850))
                .notes("Healthy flock, uniform growth")
                .build();
        dailyRecordService.addDailyRecord(batchId, dr1, farmer1UserId);

        // 4. Record Sales
        SaleRequest s1 = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Apex Poultry Traders")
                .birdsSold(1500)
                .totalWeightKg(BigDecimal.valueOf(3150))
                .ratePerKg(BigDecimal.valueOf(2.80))
                .liftingSignature("J. Doe")
                .build();
        saleService.addSale(batchId, s1, farmer1UserId);

        SaleRequest s2 = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Apex Poultry Traders - Final Lifting")
                .birdsSold(1488)
                .totalWeightKg(BigDecimal.valueOf(3124.8))
                .ratePerKg(BigDecimal.valueOf(2.80))
                .liftingSignature("J. Doe")
                .build();
        saleService.addSale(batchId, s2, farmer1UserId);

        // 5. Record Vaccines
        VaccineRequest v1 = VaccineRequest.builder()
                .vaccineName("Lasota NDV")
                .remarks("Water vaccination day 7")
                .build();
        vaccineService.addVaccine(batchId, v1, farmer1UserId);

        // 6. Record Expenses
        ExpenseRequest exp1 = ExpenseRequest.builder()
                .expenseDate(LocalDate.now())
                .category(ExpenseCategory.MEDICINE)
                .amount(BigDecimal.valueOf(450.00))
                .description("Vitamins and antibiotic booster")
                .build();
        expenseService.addExpense(batchId, exp1, farmer1UserId);

        // 7. Record Remark
        RemarkRequest rem1 = RemarkRequest.builder()
                .remarkDate(LocalDate.now())
                .note("Final pre-harvest veterinary inspection cleared.")
                .build();
        remarkService.addRemark(batchId, rem1, farmer1UserId);

        // 8. Attempt to generate Closing Report on ACTIVE batch -> Expect 409 Conflict
        assertThatThrownBy(() -> batchClosingReportPdfService.generateClosingReport(batchId, farmer1UserId, Role.FARMER))
                .isInstanceOf(BatchNotEligibleForClosingReportException.class)
                .hasMessageContaining("Closing reports can only be generated for COMPLETED batches");

        // 9. End the batch -> status becomes COMPLETED
        batchService.endBatch(batchId, farmer1UserId);

        // 10. Generate Closing Report as FARMER -> Returns valid PDF bytes
        byte[] pdfBytes = batchClosingReportPdfService.generateClosingReport(batchId, farmer1UserId, Role.FARMER);
        assertThat(pdfBytes).isNotEmpty();
        // Verify PDF Magic Bytes (%PDF-)
        String pdfHeader = new String(pdfBytes, 0, Math.min(pdfBytes.length, 5));
        assertThat(pdfHeader).isEqualTo("%PDF-");

        // 11. Test via Controller endpoint as FARMER
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        farmer1Principal, null, farmer1Principal.getAuthorities()
                )
        );
        ResponseEntity<byte[]> controllerRes = batchController.getBatchClosingReport(batchId, farmer1Principal);
        assertThat(controllerRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(controllerRes.getBody()).isNotEmpty();
        assertThat(controllerRes.getHeaders().getFirst("Content-Disposition"))
                .contains(String.format("attachment; filename=\"Batch-%s-Closing-Report.pdf\"", batch.getBatchCode()));
        assertThat(controllerRes.getHeaders().getContentType().toString()).isEqualTo("application/pdf");

        // 12. Test CEO Access -> CEO can download closing report
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        ceoPrincipal, null, ceoPrincipal.getAuthorities()
                )
        );
        ResponseEntity<byte[]> ceoRes = batchController.getBatchClosingReport(batchId, ceoPrincipal);
        assertThat(ceoRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(ceoRes.getBody()).isNotEmpty();

        // 13. Security / IDOR: Another farmer (farmer2) CANNOT download farmer1's batch report -> 403 Forbidden
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        farmer2Principal, null, farmer2Principal.getAuthorities()
                )
        );
        assertThatThrownBy(() -> batchController.getBatchClosingReport(batchId, farmer2Principal))
                .isInstanceOf(AccessDeniedException.class);

        // 14. Non-existent batch -> 404 Not Found
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        farmer1Principal, null, farmer1Principal.getAuthorities()
                )
        );
        assertThatThrownBy(() -> batchController.getBatchClosingReport(999999L, farmer1Principal))
                .isInstanceOf(EntityNotFoundException.class);
    }
}

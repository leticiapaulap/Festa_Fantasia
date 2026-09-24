package com.festafantasia.api.repository;

import com.festafantasia.api.entity.VoteCode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VoteCodeRepository extends JpaRepository<VoteCode, Long> {
    Optional<VoteCode> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select vc from VoteCode vc where vc.code = :code")
    Optional<VoteCode> findByCodeForUpdate(@Param("code") String code);

    long countByUsed(boolean used);
    boolean existsByCode(String code);
}

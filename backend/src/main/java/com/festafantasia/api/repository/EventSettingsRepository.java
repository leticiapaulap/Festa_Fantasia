package com.festafantasia.api.repository;

import com.festafantasia.api.entity.EventSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventSettingsRepository extends JpaRepository<EventSettings, Long> {
}

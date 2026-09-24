package com.festafantasia.api.exception;

import java.time.OffsetDateTime;
import java.util.List;

public record ApiError(String message, List<String> details, OffsetDateTime timestamp) {
    public static ApiError of(String message, List<String> details) {
        return new ApiError(message, details, OffsetDateTime.now());
    }
}

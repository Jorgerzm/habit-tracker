package com.habittracker.domain.repository;

import com.habittracker.domain.model.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByUserId(Long userId);

    List<Goal> findByHabitId(Long habitId);

    Optional<Goal> findByIdAndUserId(Long goalId, Long userId);
}

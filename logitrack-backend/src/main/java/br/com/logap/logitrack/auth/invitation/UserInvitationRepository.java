package br.com.logap.logitrack.auth.invitation;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

interface UserInvitationRepository extends JpaRepository<UserInvitation, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select invitation
        from UserInvitation invitation
        where lower(invitation.email) = lower(:email)
          and invitation.utilizadoEm is null
          and invitation.revogadoEm is null
        """)
    List<UserInvitation> findPendingByEmailForUpdate(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from UserInvitation invitation where invitation.tokenHash = :tokenHash")
    Optional<UserInvitation> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    Optional<UserInvitation> findByTokenHash(String tokenHash);

    @Query("select invitation.email from UserInvitation invitation where invitation.tokenHash = :tokenHash")
    Optional<String> findEmailByTokenHash(@Param("tokenHash") String tokenHash);
}

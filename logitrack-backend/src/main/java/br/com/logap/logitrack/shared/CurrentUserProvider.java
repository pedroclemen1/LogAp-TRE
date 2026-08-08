package br.com.logap.logitrack.shared;

/**
 * Quem esta operando o sistema agora.
 *
 * Porta de saida: o dominio precisa do autor para registrar no historico da
 * viagem, mas nao deve conhecer o `SecurityContextHolder`. Aquela chamada e
 * estatica, e uma estatica no meio do servico obriga qualquer teste de mutacao
 * de viagem a subir contexto do Spring so para dizer quem assinou o evento.
 *
 * Com a porta, o teste injeta um autor fixo e a producao le do contexto de
 * seguranca (ver `auth/SecurityContextCurrentUserProvider`).
 */
public interface CurrentUserProvider {

    /** Nome do autor para trilha de auditoria; nunca nulo. */
    String currentUserName();
}

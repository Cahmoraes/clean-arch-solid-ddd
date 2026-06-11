## TC-INT-002: Circuit Breaker — Proteção de chamadas externas

**Priority:** P1 (High)
**Type:** Integration
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/shared/infra/gateway/circuit-breaker.test.ts`
**Automation Notes:** Testes unitários do circuit breaker existem. Documentado para visibilidade no plano de regressão.

---

### Objective

Validar que o Circuit Breaker da camada de infraestrutura abre após atingir o threshold de falhas, rejeita chamadas quando aberto, e tenta fechar após o período de cooldown.

---

### Preconditions

- [ ] `CircuitBreaker` instanciado com configuração de teste (low threshold)

---

### Test Steps

1. **Chamadas bem-sucedidas — circuito fechado**
   - **Expected:** Circuito no estado `CLOSED`, chamadas passam normalmente

2. **Atingir threshold de falhas consecutivas**
   - Input: N falhas consecutivas (conforme configuração do threshold)
   - **Expected:** Circuito muda para estado `OPEN`

3. **Chamada quando circuito está `OPEN`**
   - **Expected:** Chamada rejeitada imediatamente sem invocar o serviço externo

4. **Após período de cooldown — estado `HALF_OPEN`**
   - Input: Aguardar o tempo de reset
   - **Expected:** Circuito muda para `HALF_OPEN`, permite uma chamada de prova

5. **Chamada de prova bem-sucedida — fechar circuito**
   - **Expected:** Circuito retorna para `CLOSED`

6. **Chamada de prova com falha — reabrir circuito**
   - **Expected:** Circuito retorna para `OPEN`

---

### Related Test Cases

- TC-INT-003: Retry mechanism

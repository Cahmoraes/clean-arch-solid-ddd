# Ledger — notification-delete
Task 2: Ruling: api-types/index.d.ts commitado (plano dizia gitignored, mas e versionado) — task-03 depende dele — custo se errado: diff gerado extra no PR
Task 2: Ruling: 400 para id invalido mantido — task-02.md (l.11 e l.396) exige 400 e o sibling mark-as-read faz igual; spec l.34 (204/401/404) ficou defasada — custo se errado: nenhum no codigo, so drift de doc
Task 2: minor (deferred): alinhar spec/plano (spec l.34 e Restricoes Globais) para listar 400 no OpenAPI
Task 3: parked — rollback por snapshot sobrescreve cache com 2 DELETEs concorrentes (use-notifications.ts:284-300,525) — Ruling: spec l.57/90/110 e task-03 l.11/483 mandam restaurar snapshot, mesmo padrao do markAsRead; janela estreita, sem regressao do spec; real mas diferida
Task 3: minor (deferred): restoreNotificationsSnapshot e DeleteNotificationContext duplicam o onError/MarkAsReadContext do markAsRead (use-notifications.ts:284-300 vs 477-490)
Task 3: minor (deferred): if (error) throw toApiError(error) redundante dentro do try (use-notifications.ts:139-150)
Task 3: unverified: refetch/fetchNextPage iniciado entre onMutate e o DELETE pode trazer o item de volta sem correcao em 204
Task 4: Ruling: NoticePreview (features/notices/components/notice-preview.tsx:59) e 2o consumidor de NotificationItem nao previsto no plano; passa onDelete no-op ignoreDelete (mesmo precedente de ignoreMarkAsRead) e o teste notice-preview.test.tsx filtra o botao principal por nome; write-set da task 4 estendido a esses 2 arquivos — onDelete continua obrigatorio (interface do plano) — custo se errado: botao de excluir inerte na previa admin (revelado so em hover/foco/touch)
Task 4: fix round 1 (0 addressed, 1 open): botao de excluir cobre ponto de nao lida (notification-item.tsx:126)
Task 4: fix round 1 (1 addressed, 0 open)
Task 4: unverified: geometria do botao de excluir vs hora/ponto so verificada por aritmetica de classes, nao renderizada em navegador
Task 5: minor (deferred): dropdown com lista vazia e hasNextPage true fica com <ul> vazio sem texto visivel ate o fetch (notification-dropdown.tsx:95)
Final review: Ruling: Important #2 (sem refetch da lista em 204) mantido como esta — spec l.57 e D2 mandam a lista permanecer como esta em 204 (sem refetch das paginas carregadas, sem pulo de scroll); janela estreita, ja parked na task 3 — custo se errado: item pode reaparecer se um refetch cruzar o DELETE
Final review: Ruling: Important #1 (excluir item inserido via SSE desalinha fetchedCount/total) corrigido SEM refetch de lista, para respeitar spec D2 — custo se errado: contagem do cache continua desalinhada nesse caso
Final review: minor (deferred): mark-as-read.usecase.ts sem checagem isDeleted (PATCH em item excluido devolve 200) — pre-existente e fora do escopo desta feature
Final review: Ruling: NoticePreview com botao de excluir inerte na previa admin mantido (precedente ignoreMarkAsRead); alternativa onDelete opcional contraria a interface do plano — custo se errado: botao morto no hover da previa
Final review: fix round 1 (0 addressed, 2 open): SSE-count-skew, 404 nao invalida contagem
Final review: fix round 1 (2 addressed, 0 open) — commit c5597a50, RED->GREEN por teste

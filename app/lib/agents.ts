export const agents = /* (agentId: number) => */ {
    supportBot: {
      name: 'Support Bot',
      description: 'Beantwoordt vragen over klantenservice',
      systemPrompt: 'Je bent een klantenservice-assistent.',
    },
    salesBot: {
      name: 'Sales Bot',
      description: 'Helpt bij verkoopvragen',
      systemPrompt: 'Je bent een behulpzame verkoper.',
    },
    onboardingBot: {
        name: 'Sales Bot',
        description: 'Helpt bij verkoopvragen',
        systemPrompt: 'Je bent een behulpzame verkoper.',
      },
      assistentBot: {
        name: 'Sales Bot',
        description: 'Helpt bij verkoopvragen',
        systemPrompt: 'Je bent een behulpzame verkoper.',
      },
      delegatieBot: {
        name: 'Sales Bot',
        description: 'Helpt bij verkoopvragen',
        systemPrompt: 'Je bent een behulpzame verkoper.',
      }
    //return bot[agentId]
  } as const;
  
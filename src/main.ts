import 'reflect-metadata'

import { serverBuild } from '@/bootstrap/server-build'

import { setupCronJob } from './bootstrap/setup-cron-job'
import type { HttpServer } from './shared/infra/server/http-server'

async function main(): Promise<HttpServer> {
  const server = await serverBuild()
  await server.listen()
  setupCronJob()
  return server
}

async function setupGracefulShutdown(server: HttpServer): Promise<void> {
  await server.close()
  process.exit()
}

const server = await main()

process.on('SIGINT', () => setupGracefulShutdown(server))
process.on('SIGTERM', () => setupGracefulShutdown(server))

// import { StripeSubscriptionGateway } from './shared/infra/gateway/stripe-subscription-gateway'

// const subscriptionGateway = new StripeSubscriptionGateway()

// const customer = await subscriptionGateway.createCustomer({
//   email: 'joao1.silva@example.com',
//   name: 'João Silva',
//   metadata: {
//     userId: '4e6e3301-304d-4333-a5b7-01e469d9b484',
//   },
// })

// console.log(customer)

// // const stripe = new Stripe(env.STRIPE_PRIVATE_KEY)

// // async function listProducts() {
// //   const products = await stripe.products.list({
// //     active: true,
// //     limit: 10,
// //   })

// //   console.log('Produtos disponíveis:')
// //   products.data.forEach((product) => {
// //     console.log(`- ${product.name} (ID: ${product.id})`)
// //   })

// //   return products.data
// // }

// // async function listPrices() {
// //   const prices = await stripe.prices.list({
// //     active: true,
// //     limit: 10,
// //   })

// //   console.log('\nPreços disponíveis:')
// //   for (const price of prices.data) {
// //     const product = await stripe.products.retrieve(price.product as string)
// //     console.log(
// //       `- ${product.name}: ${price.unit_amount ? price.unit_amount / 100 : 'N/A'} ${price.currency} (${price.recurring?.interval || 'único'})`,
// //     )
// //   }

// //   return prices.data
// // }

// // async function getProductsForSubscription() {
// //   try {
// //     const products = await listProducts()
// //     const prices = await listPrices()

// //     return { products, prices }
// //   } catch (error) {
// //     console.error('Erro ao buscar produtos:', error)
// //     throw error
// //   }
// // }

// // async function createSubscription(customerId: string, priceId: string) {
// //   try {
// //     const subscription = await stripe.subscriptions.create({
// //       customer: customerId,
// //       items: [
// //         {
// //           price: priceId,
// //         },
// //       ],
// //       payment_behavior: 'default_incomplete',
// //       payment_settings: { save_default_payment_method: 'on_subscription' },
// //       expand: ['latest_invoice.payment_intent'],
// //     })

// //     console.log('Assinatura criada:', subscription.id)
// //     return subscription
// //   } catch (error) {
// //     console.error('Erro ao criar assinatura:', error)
// //     throw error
// //   }
// // }

// // async function createCustomer(email: string, name?: string) {
// //   try {
// //     const customer = await stripe.customers.create({
// //       email,
// //       name,
// //       metadata
// //     })

// //     console.log('Cliente criado:', customer.id)
// //     return customer
// //   } catch (error) {
// //     console.error('Erro ao criar cliente:', error)
// //     throw error
// //   }
// // }

// // async function getOrCreateCustomer(email: string, name?: string) {
// //   try {
// //     // Primeiro, tenta buscar um cliente existente pelo email
// //     const existingCustomers = await stripe.customers.list({
// //       email,
// //       limit: 1,
// //     })

// //     const price = await stripe.prices.create({
// //       unit_amount: input.price * 100,
// //       currency: 'brl',
// //       recurring: { interval: 'month' },
// //       product_data: { name: 'Plano Academia Simulado' },
// //     })

// //     if (existingCustomers.data.length > 0) {
// //       console.log('Cliente existente encontrado:', existingCustomers.data[0].id)
// //       return existingCustomers.data[0]
// //     }

// //     // Se não encontrou, cria um novo cliente
// //     console.log('Criando novo cliente...')
// //     return await createCustomer(email, name)
// //   } catch (error) {
// //     console.error('Erro ao buscar ou criar cliente:', error)
// //     throw error
// //   }
// // }

// // // Funções auxiliares para buscar produtos específicos

// // /*
// // // Exemplo: Buscar produto por ID
// // async function getProductById(productId: string) {
// //   try {
// //     const product = await stripe.products.retrieve(productId)
// //     console.log(`Produto encontrado: ${product.name}`)
// //     return product
// //   } catch (error) {
// //     console.error(`Erro ao buscar produto ${productId}:`, error)
// //     throw error
// //   }
// // }

// // // Exemplo: Buscar preços de um produto específico
// // async function getPricesByProduct(productId: string) {
// //   try {
// //     const prices = await stripe.prices.list({
// //       product: productId,
// //       active: true,
// //     })

// //     console.log(`Preços para produto ${productId}:`)
// //     prices.data.forEach((price) => {
// //       console.log(
// //         `- ${price.unit_amount ? price.unit_amount / 100 : 'N/A'} ${price.currency} (${price.recurring?.interval || 'único'})`,
// //       )
// //     })

// //     return prices.data
// //   } catch (error) {
// //     console.error(`Erro ao buscar preços do produto ${productId}:`, error)
// //     throw error
// //   }
// // }

// // // Exemplo: Buscar produtos por nome
// // async function searchProductsByName(name: string) {
// //   try {
// //     const products = await stripe.products.search({
// //       query: `name:'${name}'`,
// //     })

// //     console.log(`Produtos encontrados com nome '${name}':`)
// //     products.data.forEach((product) => {
// //       console.log(`- ${product.name} (ID: ${product.id})`)
// //     })

// //     return products.data
// //   } catch (error) {
// //     console.error(`Erro ao buscar produtos com nome '${name}':`, error)
// //     throw error
// //   }
// // }
// // */

// // // Exemplo de uso
// // async function main() {
// //   try {
// //     // 1. Criar um cliente primeiro
// //     const customer = await createCustomer('teste@exemplo.com', 'Cliente Teste')

// //     // 2. Buscar produtos e preços
// //     const { prices } = await getProductsForSubscription()

// //     // 3. Criar assinatura com o primeiro preço encontrado
// //     console.log(prices)
// //     if (prices.length > 0) {
// //       console.log(`\nUsando preço: ${prices[0].id} para criar assinatura`)
// //       const subscription = await createSubscription(
// //         customer.id, // Usar o ID do cliente criado
// //         prices[0].id,
// //       )
// //       console.log('Assinatura criada:', subscription.id)
// //     }
// //   } catch (error) {
// //     console.error('Erro na execução:', error)
// //   }
// // }

// // // Executar o exemplo
// // main()

// // /*
// // OUTRAS OPÇÕES PARA TRABALHAR COM CLIENTES:

// // 1. Se você já tem um ID de cliente válido:
// //    const customerId = 'cus_XXXXXXXX' // ID real do Stripe
// //    const subscription = await createSubscription(customerId, priceId)

// // 2. Usar a função getOrCreateCustomer para evitar duplicatas:
// //    const customer = await getOrCreateCustomer('email@exemplo.com', 'Nome')
// //    const subscription = await createSubscription(customer.id, priceId)

// // 3. Listar clientes existentes:
// //    const customers = await stripe.customers.list({ limit: 10 })
// //    console.log('Clientes existentes:', customers.data)

// // 4. Buscar cliente por email:
// //    const customers = await stripe.customers.list({ email: 'email@exemplo.com' })
// //    if (customers.data.length > 0) {
// //      const customerId = customers.data[0].id
// //    }
// // */

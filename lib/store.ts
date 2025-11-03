// Global state management using localStorage
export interface User {
  id: string
  email: string
  name: string
  role: "customer" | "admin"
  createdAt: string
  isBanned?: boolean
  profileImage?: string
  phone?: string
  address?: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  discountedPrice?: number
  discount?: number
  image: string
  images?: string[]
  category: string
  categories?: string[]
  stock: number
  createdAt: string
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface Order {
  id: string
  userId: string | null
  email: string
  items: Array<{ productId: string; quantity: number; price: number }>
  total: number
  couponCode?: string
  discount: number
  paymentMethod: "card" | "cod"
  status: "pending" | "completed" | "cancelled"
  shippingAddress: string
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  discount: number
  expiryDate: string
  maxUses: number
  usedCount: number
  assignedTo?: string
  assignedType?: "all" | "customer" | "product"
  assignedId?: string
}

// Initialize mock data
const initializeMockData = () => {
  if (typeof window === "undefined") return

  const existingUsers = localStorage.getItem("users")
  const existingProducts = localStorage.getItem("products")
  const existingCategories = localStorage.getItem("categories")
  const existingCoupons = localStorage.getItem("coupons")

  if (!existingUsers) {
    const mockUsers: User[] = [
      {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ]
    localStorage.setItem("users", JSON.stringify(mockUsers))
  }

  if (!existingProducts) {
    const mockProducts: Product[] = [
      {
        id: "prod-1",
        name: "Premium Wireless Headphones",
        description:
          "High-quality wireless headphones with noise cancellation, 30-hour battery life, and premium sound quality",
        price: 199.99,
        discountedPrice: 149.99,
        discount: 25,
        image: "/wireless-headphones.png",
        images: [
          "/wireless-headphones.png",
          "/wireless-headphones-front.png",
          "/wireless-headphones-side.png",
          "/wireless-headphones-back.png",
        ],
        category: "Electronics",
        categories: ["Electronics", "Audio"],
        stock: 50,
        createdAt: new Date().toISOString(),
      },
      {
        id: "prod-2",
        name: "Smartwatch Pro",
        description: "Advanced smartwatch with health tracking, fitness modes, heart rate monitor, and 7-day battery",
        price: 299.99,
        discountedPrice: 249.99,
        discount: 17,
        image: "/modern-smartwatch.png",
        images: ["/modern-smartwatch.png", "/smartwatch-front.png", "/smartwatch-side.jpg", "/smartwatch-back.jpg"],
        category: "Electronics",
        categories: ["Electronics", "Wearables"],
        stock: 30,
        createdAt: new Date().toISOString(),
      },
      {
        id: "prod-3",
        name: "USB-C Cable",
        description:
          "Durable USB-C charging cable with fast charging support, 2-meter length, and reinforced connectors",
        price: 19.99,
        image: "/usb-cable.png",
        images: ["/usb-cable.png", "/usb-cable-coiled.jpg", "/usb-cable-straight.jpg"],
        category: "Accessories",
        categories: ["Accessories", "Cables"],
        stock: 200,
        createdAt: new Date().toISOString(),
      },
      {
        id: "prod-4",
        name: "Portable Power Bank",
        description: "20000mAh portable power bank with fast charging, dual USB ports, and LED display",
        price: 49.99,
        discountedPrice: 39.99,
        discount: 20,
        image: "/portable-power-bank.png",
        images: ["/portable-power-bank.png", "/power-bank-front.jpg", "/power-bank-back.jpg", "/power-bank-side.jpg"],
        category: "Accessories",
        categories: ["Accessories", "Power"],
        stock: 100,
        createdAt: new Date().toISOString(),
      },
      {
        id: "prod-5",
        name: "Mechanical Keyboard",
        description: "RGB mechanical keyboard with customizable switches, aluminum frame, and programmable keys",
        price: 129.99,
        image: "/mechanical-keyboard.png",
        images: ["/mechanical-keyboard.png", "/mechanical-keyboard-top.jpg", "/mechanical-keyboard-side.jpg"],
        category: "Electronics",
        categories: ["Electronics", "Keyboards"],
        stock: 40,
        createdAt: new Date().toISOString(),
      },
      {
        id: "prod-6",
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with precision tracking, silent clicking, and 18-month battery life",
        price: 39.99,
        image: "/wireless-mouse.png",
        images: ["/wireless-mouse.png", "/wireless-mouse-top.jpg", "/wireless-mouse-bottom.jpg"],
        category: "Accessories",
        categories: ["Accessories", "Mice"],
        stock: 80,
        createdAt: new Date().toISOString(),
      },
    ]
    localStorage.setItem("products", JSON.stringify(mockProducts))
  }

  if (!existingCategories) {
    // Seed categories from products
    const products: Product[] = JSON.parse(localStorage.getItem("products") || "[]")
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
      ;(p.categories || []).forEach((c) => set.add(c))
    })
    localStorage.setItem("categories", JSON.stringify(Array.from(set)))
  }

  if (!existingCoupons) {
    const mockCoupons: Coupon[] = [
      {
        id: "coupon-1",
        code: "SAVE10",
        discount: 10,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUses: 100,
        usedCount: 0,
      },
      {
        id: "coupon-2",
        code: "SAVE20",
        discount: 20,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUses: 50,
        usedCount: 0,
      },
    ]
    localStorage.setItem("coupons", JSON.stringify(mockCoupons))
  }
}

// User management
export const getUsers = (): User[] => {
  if (typeof window === "undefined") return []
  initializeMockData()
  return JSON.parse(localStorage.getItem("users") || "[]")
}

export const getUserById = (id: string): User | null => {
  const users = getUsers()
  return users.find((u) => u.id === id) || null
}

export const getUserByEmail = (email: string): User | null => {
  const users = getUsers()
  return users.find((u) => u.email === email) || null
}

export const createUser = (data: {
  email: string
  name: string
  password?: string
  role?: "customer" | "admin"
}): User => {
  const users = getUsers()
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: data.email,
    name: data.name,
    role: data.role || "customer",
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  localStorage.setItem("users", JSON.stringify(users))
  return newUser
}

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null
  users[index] = { ...users[index], ...updates }
  localStorage.setItem("users", JSON.stringify(users))
  return users[index]
}

export const deleteUser = (id: string): boolean => {
  const users = getUsers()
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) return false
  localStorage.setItem("users", JSON.stringify(filtered))
  return true
}

export const banUser = (id: string): User | null => {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null
  users[index] = { ...users[index], isBanned: true }
  localStorage.setItem("users", JSON.stringify(users))
  return users[index]
}

export const unbanUser = (id: string): User | null => {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null
  users[index] = { ...users[index], isBanned: false }
  localStorage.setItem("users", JSON.stringify(users))
  return users[index]
}

// Product management
export const getProducts = (): Product[] => {
  if (typeof window === "undefined") return []
  initializeMockData()
  return JSON.parse(localStorage.getItem("products") || "[]")
}

export const getProductById = (id: string): Product | null => {
  const products = getProducts()
  return products.find((p) => p.id === id) || null
}

export const createProduct = (product: Omit<Product, "id" | "createdAt">): Product => {
  const products = getProducts()
  const newProduct: Product = {
    ...product,
    id: `prod-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  // keep primary category in sync with categories[] if provided
  if (!newProduct.category && newProduct.categories && newProduct.categories.length > 0) {
    newProduct.category = newProduct.categories[0]
  }
  products.push(newProduct)
  localStorage.setItem("products", JSON.stringify(products))
  // merge categories store
  if (newProduct.category || (newProduct.categories && newProduct.categories.length)) {
    const cats = new Set(getCategories())
    if (newProduct.category) cats.add(newProduct.category)
    ;(newProduct.categories || []).forEach((c) => cats.add(c))
    localStorage.setItem("categories", JSON.stringify(Array.from(cats)))
  }
  return newProduct
}

export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const products = getProducts()
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return null
  const merged = { ...products[index], ...updates } as Product
  if (!merged.category && merged.categories && merged.categories.length > 0) {
    merged.category = merged.categories[0]
  }
  products[index] = merged
  localStorage.setItem("products", JSON.stringify(products))
  // sync categories store
  const cats = new Set(getCategories())
  if (merged.category) cats.add(merged.category)
  ;(merged.categories || []).forEach((c) => cats.add(c))
  localStorage.setItem("categories", JSON.stringify(Array.from(cats)))
  return products[index]
}

export const deleteProduct = (id: string): boolean => {
  const products = getProducts()
  const filtered = products.filter((p) => p.id !== id)
  if (filtered.length === products.length) return false
  localStorage.setItem("products", JSON.stringify(filtered))
  return true
}

// Category management (local storage list of strings)
export const getCategories = (): string[] => {
  if (typeof window === "undefined") return []
  initializeMockData()
  return JSON.parse(localStorage.getItem("categories") || "[]")
}

export const addCategory = (name: string): string[] => {
  const categories = new Set(getCategories())
  if (name && name.trim()) categories.add(name.trim())
  const list = Array.from(categories)
  localStorage.setItem("categories", JSON.stringify(list))
  return list
}

export const renameCategory = (oldName: string, newName: string): string[] => {
  const list = getCategories().filter((c) => c !== oldName)
  if (newName && newName.trim()) list.push(newName.trim())
  localStorage.setItem("categories", JSON.stringify(Array.from(new Set(list))))
  // Optionally update products using oldName as primary or in categories[]
  const products = getProducts().map((p) => {
    let changed = false
    if (p.category === oldName) {
      p.category = newName
      changed = true
    }
    if (p.categories && p.categories.length) {
      const updated = p.categories.map((c) => (c === oldName ? newName : c))
      if (JSON.stringify(updated) !== JSON.stringify(p.categories)) {
        p.categories = updated
        changed = true
      }
    }
    return p
  })
  localStorage.setItem("products", JSON.stringify(products))
  return getCategories()
}

export const deleteCategoryByName = (name: string): string[] => {
  const list = getCategories().filter((c) => c !== name)
  localStorage.setItem("categories", JSON.stringify(list))
  // Do not delete from products; keep legacy references
  return list
}

// Order management
export const getOrders = (): Order[] => {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem("orders") || "[]")
}

export const getOrdersByUserId = (userId: string): Order[] => {
  const orders = getOrders()
  return orders.filter((o) => o.userId === userId)
}

export const createOrder = (order: Omit<Order, "id" | "createdAt">): Order => {
  const orders = getOrders()
  const newOrder: Order = {
    ...order,
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  orders.push(newOrder)
  localStorage.setItem("orders", JSON.stringify(orders))
  return newOrder
}

export const updateOrder = (id: string, updates: Partial<Order>): Order | null => {
  const orders = getOrders()
  const index = orders.findIndex((o) => o.id === id)
  if (index === -1) return null
  orders[index] = { ...orders[index], ...updates }
  localStorage.setItem("orders", JSON.stringify(orders))
  return orders[index]
}

export const deleteOrder = (id: string): boolean => {
  const orders = getOrders()
  const filtered = orders.filter((o) => o.id !== id)
  if (filtered.length === orders.length) return false
  localStorage.setItem("orders", JSON.stringify(filtered))
  return true
}

// Coupon management
export const getCoupons = (): Coupon[] => {
  if (typeof window === "undefined") return []
  initializeMockData()
  return JSON.parse(localStorage.getItem("coupons") || "[]")
}

export const getCouponByCode = (code: string): Coupon | null => {
  const coupons = getCoupons()
  return coupons.find((c) => c.code === code) || null
}

export const createCoupon = (coupon: Omit<Coupon, "id" | "usedCount">): Coupon => {
  const coupons = getCoupons()
  const newCoupon: Coupon = {
    ...coupon,
    id: `coupon-${Date.now()}`,
    usedCount: 0,
    assignedTo: coupon.assignedTo || "all",
    assignedType: coupon.assignedType || "all",
    assignedId: coupon.assignedId || "",
  }
  coupons.push(newCoupon)
  localStorage.setItem("coupons", JSON.stringify(coupons))
  return newCoupon
}

export const updateCoupon = (id: string, updates: Partial<Coupon>): Coupon | null => {
  const coupons = getCoupons()
  const index = coupons.findIndex((c) => c.id === id)
  if (index === -1) return null
  coupons[index] = { ...coupons[index], ...updates }
  localStorage.setItem("coupons", JSON.stringify(coupons))
  return coupons[index]
}

export const deleteCoupon = (id: string): boolean => {
  const coupons = getCoupons()
  const filtered = coupons.filter((c) => c.id !== id)
  if (filtered.length === coupons.length) return false
  localStorage.setItem("coupons", JSON.stringify(filtered))
  return true
}

// Cart management
export const getCart = (): CartItem[] => {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem("cart") || "[]")
}

export const addToCart = (productId: string, quantity = 1): void => {
  const cart = getCart()
  const existingItem = cart.find((item) => item.productId === productId)
  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({ productId, quantity })
  }
  localStorage.setItem("cart", JSON.stringify(cart))
}

export const removeFromCart = (productId: string): void => {
  const cart = getCart()
  const filtered = cart.filter((item) => item.productId !== productId)
  localStorage.setItem("cart", JSON.stringify(filtered))
}

export const updateCartItem = (productId: string, quantity: number): void => {
  const cart = getCart()
  const item = cart.find((item) => item.productId === productId)
  if (item) {
    item.quantity = quantity
    if (item.quantity <= 0) {
      removeFromCart(productId)
    } else {
      localStorage.setItem("cart", JSON.stringify(cart))
    }
  }
}

export const clearCart = (): void => {
  localStorage.setItem("cart", JSON.stringify([]))
}

export const getCurrency = (): { code: string; symbol: string; rate: number } => {
  if (typeof window === "undefined") return { code: "USD", symbol: "$", rate: 1 }
  const currency = localStorage.getItem("currency")
  return currency ? JSON.parse(currency) : { code: "USD", symbol: "$", rate: 1 }
}

export const setCurrency = (currency: { code: string; symbol: string; rate: number }): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("currency", JSON.stringify(currency))
}

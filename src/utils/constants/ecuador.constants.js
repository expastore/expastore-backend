// ecuador.constants.js
module.exports = {
  // Impuesto al Valor Agregado (IVA)
  TAX: {
    // Tasa actual vigente en Ecuador (2024-2025)
    CURRENT_RATE: 0.15,
    
    // Todas las tasas disponibles
    RATES: {
      STANDARD: 0.15,          // IVA general (15%)
      REDUCED: 0.12,           // Algunos productos turísticos (12%) - verificar vigencia
      ZERO: 0.00,              // Tasa 0% (canasta básica, medicinas, etc.)
      EXEMPT: null,            // Exento (no aplica IVA)
      NOT_TAXED: null          // No objeto de impuesto (servicios financieros)
    },
    
    // Códigos de impuestos según SRI
    SRI_CODES: {
      STANDARD: '2',           // IVA 15%
      REDUCED: '2',            // IVA 12% - mismo código, diferente porcentaje
      ZERO: '2',               // IVA 0% - mismo código
      EXEMPT: '2',             // Exento
      ICE: '3',                // Impuesto a los Consumos Especiales
      IRBPNR: '5'              // Impuesto a la Renta de no Residentes
    },
    
    // Categorías con tasas especiales (ejemplos)
    CATEGORIES: {
      // Tasa 0%
      ZERO_RATE: [
        'alimentos-basicos',   // Canasta básica
        'medicinas',           // Medicamentos
        'libros',              // Libros, periódicos
        'educacion',           // Servicios educativos
        'transporte-publico'   // Transporte público
      ],
      
      // Tasa reducida (12%) - verificar vigencia actual
      REDUCED_RATE: [
        'turismo',             // Servicios turísticos
        'hoteles-3-estrellas'  // Hoteles 1-3 estrellas
      ],
      
      // Tasa estándar (15%)
      STANDARD_RATE: [
        'electronica',
        'ropa',
        'muebles',
        'vehiculos',
        'restaurantes'
      ],
      
      // Exentos
      EXEMPT: [
        'servicios-financieros',
        'alquiler-vivienda',
        'seguros'
      ]
    }
  },
  
  // Impuesto a los Consumos Especiales (ICE)
  ICE: {
    // Tasas de ICE para productos específicos
    RATES: {
      CIGARRILLOS: 0.30,       // 30% aprox (varía)
      CERVEZA: 0.10,           // 10% aprox
      LICORES: 0.25,           // 25% aprox
      VEHICULOS_LUJO: 0.05,    // 5% para vehículos > $30,000
      BEBIDAS_AZUCARADAS: 0.18 // 18% para bebidas azucaradas
    },
    
    // Umbrales para aplicación
    THRESHOLDS: {
      VEHICULOS: 30000,        // USD - vehículos > $30,000 pagan ICE
      CELULARES: 500           // USD - celulares > $500
    }
  },
  
  // Retenciones en la Fuente
  WITHHOLDING: {
    RATES: {
      SERVICES: 0.08,          // 8% para servicios profesionales
      RENTALS: 0.10,           // 10% para alquileres
      IMPORT_SERVICES: 0.25    // 25% para servicios del exterior
    }
  },
  
  // Regímenes fiscales
  FISCAL_REGIMES: {
    RIMPE: {
      NAME: 'Régimen Impositivo Simplificado',
      MONTHLY_LIMIT: 300000,   // $300,000 anuales
      EXEMPT_UP_TO: 20000      // Exento hasta $20,000 anuales
    },
    RISE: {
      NAME: 'Régimen Simplificado para Emprendedores',
      ANNUAL_LIMIT: 100000     // $100,000 anuales
    }
  },
  
  // Información de facturación
  INVOICE: {
    SEQUENCE_LENGTH: 9,        // Longitud de la secuencia
    SERIES: '001',             // Serie por defecto
    ENVIRONMENT: {
      PRODUCTION: '1',
      TESTING: '2'
    },
    EMISSION: {
      NORMAL: '1',
      CONTINGENCY: '2'
    }
  },
  
  // Moneda
  CURRENCY: {
    CODE: 'USD',
    SYMBOL: '$',
    DECIMALS: 2,
    NAME: 'Dólar Estadounidense'
  },
  
  // Información del país
  COUNTRY: {
    NAME: 'Ecuador',
    CODE: 'EC',
    PHONE_CODE: '+593',
    TIMEZONE: 'America/Guayaquil'
  },
  
  // Utilidades
  UTILS: {
    // Redondeo fiscal (según SRI)
    ROUNDING: {
      TAX: 4,                  // Decimales para cálculo
      TOTAL: 2                 // Decimales para totales
    },
    
    // Validaciones
    VALID_RATES: [0, 0.12, 0.15],  // Tasas válidas de IVA
    VALID_TAX_CODES: ['2', '3', '5'], // Códigos válidos SRI
    MIN_INVOICE_AMOUNT: 0.01,      // Monto mínimo facturable
    
    // Formato de números de identificación
    ID_FORMATS: {
      RUC: /^\d{13}$/,        // 13 dígitos
      CEDULA: /^\d{10}$/,     // 10 dígitos
      PASSPORT: /^[A-Z0-9]{6,9}$/  // Pasaporte
    }
  }
};
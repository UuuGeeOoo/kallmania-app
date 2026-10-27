
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Report
 * 
 */
export type Report = $Result.DefaultSelection<Prisma.$ReportPayload>
/**
 * Model ReportTemplate
 * 
 */
export type ReportTemplate = $Result.DefaultSelection<Prisma.$ReportTemplatePayload>
/**
 * Model Task
 * 
 */
export type Task = $Result.DefaultSelection<Prisma.$TaskPayload>
/**
 * Model UploadedFile
 * 
 */
export type UploadedFile = $Result.DefaultSelection<Prisma.$UploadedFilePayload>
/**
 * Model Notification
 * 
 */
export type Notification = $Result.DefaultSelection<Prisma.$NotificationPayload>
/**
 * Model KpiConfig
 * 
 */
export type KpiConfig = $Result.DefaultSelection<Prisma.$KpiConfigPayload>
/**
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model SystemFlag
 * 
 */
export type SystemFlag = $Result.DefaultSelection<Prisma.$SystemFlagPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.report`: Exposes CRUD operations for the **Report** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Reports
    * const reports = await prisma.report.findMany()
    * ```
    */
  get report(): Prisma.ReportDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.reportTemplate`: Exposes CRUD operations for the **ReportTemplate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ReportTemplates
    * const reportTemplates = await prisma.reportTemplate.findMany()
    * ```
    */
  get reportTemplate(): Prisma.ReportTemplateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.task`: Exposes CRUD operations for the **Task** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tasks
    * const tasks = await prisma.task.findMany()
    * ```
    */
  get task(): Prisma.TaskDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.uploadedFile`: Exposes CRUD operations for the **UploadedFile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UploadedFiles
    * const uploadedFiles = await prisma.uploadedFile.findMany()
    * ```
    */
  get uploadedFile(): Prisma.UploadedFileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.notification`: Exposes CRUD operations for the **Notification** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Notifications
    * const notifications = await prisma.notification.findMany()
    * ```
    */
  get notification(): Prisma.NotificationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.kpiConfig`: Exposes CRUD operations for the **KpiConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more KpiConfigs
    * const kpiConfigs = await prisma.kpiConfig.findMany()
    * ```
    */
  get kpiConfig(): Prisma.KpiConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.systemFlag`: Exposes CRUD operations for the **SystemFlag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SystemFlags
    * const systemFlags = await prisma.systemFlag.findMany()
    * ```
    */
  get systemFlag(): Prisma.SystemFlagDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Report: 'Report',
    ReportTemplate: 'ReportTemplate',
    Task: 'Task',
    UploadedFile: 'UploadedFile',
    Notification: 'Notification',
    KpiConfig: 'KpiConfig',
    AuditLog: 'AuditLog',
    SystemFlag: 'SystemFlag'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "report" | "reportTemplate" | "task" | "uploadedFile" | "notification" | "kpiConfig" | "auditLog" | "systemFlag"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Report: {
        payload: Prisma.$ReportPayload<ExtArgs>
        fields: Prisma.ReportFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          findFirst: {
            args: Prisma.ReportFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          findMany: {
            args: Prisma.ReportFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>[]
          }
          create: {
            args: Prisma.ReportCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          createMany: {
            args: Prisma.ReportCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>[]
          }
          delete: {
            args: Prisma.ReportDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          update: {
            args: Prisma.ReportUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          deleteMany: {
            args: Prisma.ReportDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ReportUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>[]
          }
          upsert: {
            args: Prisma.ReportUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportPayload>
          }
          aggregate: {
            args: Prisma.ReportAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReport>
          }
          groupBy: {
            args: Prisma.ReportGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportCountArgs<ExtArgs>
            result: $Utils.Optional<ReportCountAggregateOutputType> | number
          }
        }
      }
      ReportTemplate: {
        payload: Prisma.$ReportTemplatePayload<ExtArgs>
        fields: Prisma.ReportTemplateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReportTemplateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReportTemplateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          findFirst: {
            args: Prisma.ReportTemplateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReportTemplateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          findMany: {
            args: Prisma.ReportTemplateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>[]
          }
          create: {
            args: Prisma.ReportTemplateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          createMany: {
            args: Prisma.ReportTemplateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReportTemplateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>[]
          }
          delete: {
            args: Prisma.ReportTemplateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          update: {
            args: Prisma.ReportTemplateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          deleteMany: {
            args: Prisma.ReportTemplateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReportTemplateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ReportTemplateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>[]
          }
          upsert: {
            args: Prisma.ReportTemplateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReportTemplatePayload>
          }
          aggregate: {
            args: Prisma.ReportTemplateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReportTemplate>
          }
          groupBy: {
            args: Prisma.ReportTemplateGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReportTemplateGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReportTemplateCountArgs<ExtArgs>
            result: $Utils.Optional<ReportTemplateCountAggregateOutputType> | number
          }
        }
      }
      Task: {
        payload: Prisma.$TaskPayload<ExtArgs>
        fields: Prisma.TaskFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findFirst: {
            args: Prisma.TaskFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findMany: {
            args: Prisma.TaskFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          create: {
            args: Prisma.TaskCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          createMany: {
            args: Prisma.TaskCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          delete: {
            args: Prisma.TaskDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          update: {
            args: Prisma.TaskUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          deleteMany: {
            args: Prisma.TaskDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          upsert: {
            args: Prisma.TaskUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          aggregate: {
            args: Prisma.TaskAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTask>
          }
          groupBy: {
            args: Prisma.TaskGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskCountArgs<ExtArgs>
            result: $Utils.Optional<TaskCountAggregateOutputType> | number
          }
        }
      }
      UploadedFile: {
        payload: Prisma.$UploadedFilePayload<ExtArgs>
        fields: Prisma.UploadedFileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UploadedFileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UploadedFileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          findFirst: {
            args: Prisma.UploadedFileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UploadedFileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          findMany: {
            args: Prisma.UploadedFileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          create: {
            args: Prisma.UploadedFileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          createMany: {
            args: Prisma.UploadedFileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UploadedFileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          delete: {
            args: Prisma.UploadedFileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          update: {
            args: Prisma.UploadedFileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          deleteMany: {
            args: Prisma.UploadedFileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UploadedFileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UploadedFileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          upsert: {
            args: Prisma.UploadedFileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          aggregate: {
            args: Prisma.UploadedFileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUploadedFile>
          }
          groupBy: {
            args: Prisma.UploadedFileGroupByArgs<ExtArgs>
            result: $Utils.Optional<UploadedFileGroupByOutputType>[]
          }
          count: {
            args: Prisma.UploadedFileCountArgs<ExtArgs>
            result: $Utils.Optional<UploadedFileCountAggregateOutputType> | number
          }
        }
      }
      Notification: {
        payload: Prisma.$NotificationPayload<ExtArgs>
        fields: Prisma.NotificationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.NotificationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.NotificationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          findFirst: {
            args: Prisma.NotificationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.NotificationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          findMany: {
            args: Prisma.NotificationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>[]
          }
          create: {
            args: Prisma.NotificationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          createMany: {
            args: Prisma.NotificationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.NotificationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>[]
          }
          delete: {
            args: Prisma.NotificationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          update: {
            args: Prisma.NotificationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          deleteMany: {
            args: Prisma.NotificationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.NotificationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.NotificationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>[]
          }
          upsert: {
            args: Prisma.NotificationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$NotificationPayload>
          }
          aggregate: {
            args: Prisma.NotificationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNotification>
          }
          groupBy: {
            args: Prisma.NotificationGroupByArgs<ExtArgs>
            result: $Utils.Optional<NotificationGroupByOutputType>[]
          }
          count: {
            args: Prisma.NotificationCountArgs<ExtArgs>
            result: $Utils.Optional<NotificationCountAggregateOutputType> | number
          }
        }
      }
      KpiConfig: {
        payload: Prisma.$KpiConfigPayload<ExtArgs>
        fields: Prisma.KpiConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.KpiConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.KpiConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          findFirst: {
            args: Prisma.KpiConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.KpiConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          findMany: {
            args: Prisma.KpiConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>[]
          }
          create: {
            args: Prisma.KpiConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          createMany: {
            args: Prisma.KpiConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.KpiConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>[]
          }
          delete: {
            args: Prisma.KpiConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          update: {
            args: Prisma.KpiConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          deleteMany: {
            args: Prisma.KpiConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.KpiConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.KpiConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>[]
          }
          upsert: {
            args: Prisma.KpiConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$KpiConfigPayload>
          }
          aggregate: {
            args: Prisma.KpiConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateKpiConfig>
          }
          groupBy: {
            args: Prisma.KpiConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<KpiConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.KpiConfigCountArgs<ExtArgs>
            result: $Utils.Optional<KpiConfigCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      SystemFlag: {
        payload: Prisma.$SystemFlagPayload<ExtArgs>
        fields: Prisma.SystemFlagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SystemFlagFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SystemFlagFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          findFirst: {
            args: Prisma.SystemFlagFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SystemFlagFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          findMany: {
            args: Prisma.SystemFlagFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>[]
          }
          create: {
            args: Prisma.SystemFlagCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          createMany: {
            args: Prisma.SystemFlagCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SystemFlagCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>[]
          }
          delete: {
            args: Prisma.SystemFlagDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          update: {
            args: Prisma.SystemFlagUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          deleteMany: {
            args: Prisma.SystemFlagDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SystemFlagUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SystemFlagUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>[]
          }
          upsert: {
            args: Prisma.SystemFlagUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SystemFlagPayload>
          }
          aggregate: {
            args: Prisma.SystemFlagAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSystemFlag>
          }
          groupBy: {
            args: Prisma.SystemFlagGroupByArgs<ExtArgs>
            result: $Utils.Optional<SystemFlagGroupByOutputType>[]
          }
          count: {
            args: Prisma.SystemFlagCountArgs<ExtArgs>
            result: $Utils.Optional<SystemFlagCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    report?: ReportOmit
    reportTemplate?: ReportTemplateOmit
    task?: TaskOmit
    uploadedFile?: UploadedFileOmit
    notification?: NotificationOmit
    kpiConfig?: KpiConfigOmit
    auditLog?: AuditLogOmit
    systemFlag?: SystemFlagOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    reports: number
    reviewedReports: number
    assignedTasks: number
    createdTasks: number
    notifications: number
    auditLogs: number
    uploadedFiles: number
    updatedTemplates: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    reports?: boolean | UserCountOutputTypeCountReportsArgs
    reviewedReports?: boolean | UserCountOutputTypeCountReviewedReportsArgs
    assignedTasks?: boolean | UserCountOutputTypeCountAssignedTasksArgs
    createdTasks?: boolean | UserCountOutputTypeCountCreatedTasksArgs
    notifications?: boolean | UserCountOutputTypeCountNotificationsArgs
    auditLogs?: boolean | UserCountOutputTypeCountAuditLogsArgs
    uploadedFiles?: boolean | UserCountOutputTypeCountUploadedFilesArgs
    updatedTemplates?: boolean | UserCountOutputTypeCountUpdatedTemplatesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountReportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountReviewedReportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAssignedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountNotificationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: NotificationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUploadedFilesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UploadedFileWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUpdatedTemplatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportTemplateWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    fullName: string | null
    role: string | null
    department: string | null
    team: string | null
    employeeId: string | null
    phone: string | null
    status: string | null
    approvedAt: Date | null
    approvedById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    fullName: string | null
    role: string | null
    department: string | null
    team: string | null
    employeeId: string | null
    phone: string | null
    status: string | null
    approvedAt: Date | null
    approvedById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    passwordHash: number
    fullName: number
    role: number
    department: number
    team: number
    employeeId: number
    phone: number
    status: number
    approvedAt: number
    approvedById: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    department?: true
    team?: true
    employeeId?: true
    phone?: true
    status?: true
    approvedAt?: true
    approvedById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    department?: true
    team?: true
    employeeId?: true
    phone?: true
    status?: true
    approvedAt?: true
    approvedById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    fullName?: true
    role?: true
    department?: true
    team?: true
    employeeId?: true
    phone?: true
    status?: true
    approvedAt?: true
    approvedById?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    passwordHash: string
    fullName: string
    role: string
    department: string
    team: string | null
    employeeId: string | null
    phone: string | null
    status: string
    approvedAt: Date | null
    approvedById: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    department?: boolean
    team?: boolean
    employeeId?: boolean
    phone?: boolean
    status?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    reports?: boolean | User$reportsArgs<ExtArgs>
    reviewedReports?: boolean | User$reviewedReportsArgs<ExtArgs>
    assignedTasks?: boolean | User$assignedTasksArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    notifications?: boolean | User$notificationsArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
    updatedTemplates?: boolean | User$updatedTemplatesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    department?: boolean
    team?: boolean
    employeeId?: boolean
    phone?: boolean
    status?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    department?: boolean
    team?: boolean
    employeeId?: boolean
    phone?: boolean
    status?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    fullName?: boolean
    role?: boolean
    department?: boolean
    team?: boolean
    employeeId?: boolean
    phone?: boolean
    status?: boolean
    approvedAt?: boolean
    approvedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "passwordHash" | "fullName" | "role" | "department" | "team" | "employeeId" | "phone" | "status" | "approvedAt" | "approvedById" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    reports?: boolean | User$reportsArgs<ExtArgs>
    reviewedReports?: boolean | User$reviewedReportsArgs<ExtArgs>
    assignedTasks?: boolean | User$assignedTasksArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    notifications?: boolean | User$notificationsArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
    updatedTemplates?: boolean | User$updatedTemplatesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      reports: Prisma.$ReportPayload<ExtArgs>[]
      reviewedReports: Prisma.$ReportPayload<ExtArgs>[]
      assignedTasks: Prisma.$TaskPayload<ExtArgs>[]
      createdTasks: Prisma.$TaskPayload<ExtArgs>[]
      notifications: Prisma.$NotificationPayload<ExtArgs>[]
      auditLogs: Prisma.$AuditLogPayload<ExtArgs>[]
      uploadedFiles: Prisma.$UploadedFilePayload<ExtArgs>[]
      updatedTemplates: Prisma.$ReportTemplatePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      passwordHash: string
      fullName: string
      role: string
      department: string
      team: string | null
      employeeId: string | null
      phone: string | null
      status: string
      approvedAt: Date | null
      approvedById: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    reports<T extends User$reportsArgs<ExtArgs> = {}>(args?: Subset<T, User$reportsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    reviewedReports<T extends User$reviewedReportsArgs<ExtArgs> = {}>(args?: Subset<T, User$reviewedReportsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assignedTasks<T extends User$assignedTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$assignedTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    createdTasks<T extends User$createdTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$createdTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    notifications<T extends User$notificationsArgs<ExtArgs> = {}>(args?: Subset<T, User$notificationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditLogs<T extends User$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    uploadedFiles<T extends User$uploadedFilesArgs<ExtArgs> = {}>(args?: Subset<T, User$uploadedFilesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    updatedTemplates<T extends User$updatedTemplatesArgs<ExtArgs> = {}>(args?: Subset<T, User$updatedTemplatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly fullName: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly department: FieldRef<"User", 'String'>
    readonly team: FieldRef<"User", 'String'>
    readonly employeeId: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly status: FieldRef<"User", 'String'>
    readonly approvedAt: FieldRef<"User", 'DateTime'>
    readonly approvedById: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.reports
   */
  export type User$reportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    where?: ReportWhereInput
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    cursor?: ReportWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * User.reviewedReports
   */
  export type User$reviewedReportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    where?: ReportWhereInput
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    cursor?: ReportWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * User.assignedTasks
   */
  export type User$assignedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.createdTasks
   */
  export type User$createdTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.notifications
   */
  export type User$notificationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    where?: NotificationWhereInput
    orderBy?: NotificationOrderByWithRelationInput | NotificationOrderByWithRelationInput[]
    cursor?: NotificationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: NotificationScalarFieldEnum | NotificationScalarFieldEnum[]
  }

  /**
   * User.auditLogs
   */
  export type User$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * User.uploadedFiles
   */
  export type User$uploadedFilesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    where?: UploadedFileWhereInput
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    cursor?: UploadedFileWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * User.updatedTemplates
   */
  export type User$updatedTemplatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    where?: ReportTemplateWhereInput
    orderBy?: ReportTemplateOrderByWithRelationInput | ReportTemplateOrderByWithRelationInput[]
    cursor?: ReportTemplateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReportTemplateScalarFieldEnum | ReportTemplateScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Report
   */

  export type AggregateReport = {
    _count: ReportCountAggregateOutputType | null
    _avg: ReportAvgAggregateOutputType | null
    _sum: ReportSumAggregateOutputType | null
    _min: ReportMinAggregateOutputType | null
    _max: ReportMaxAggregateOutputType | null
  }

  export type ReportAvgAggregateOutputType = {
    latenessMins: number | null
    agentsManaged: number | null
  }

  export type ReportSumAggregateOutputType = {
    latenessMins: number | null
    agentsManaged: number | null
  }

  export type ReportMinAggregateOutputType = {
    id: string | null
    ref: string | null
    type: string | null
    reportDate: Date | null
    userId: string | null
    department: string | null
    shiftTime: string | null
    clockIn: string | null
    clockOut: string | null
    attendanceStatus: string | null
    latenessMins: number | null
    kpiMetrics: string | null
    callLogs: string | null
    challenges: string | null
    escalations: string | null
    additionalActivities: string | null
    emailContext: string | null
    workEntries: string | null
    metricsSummary: string | null
    payload: string | null
    teamName: string | null
    campusLocation: string | null
    agentsManaged: number | null
    attendanceSummary: string | null
    teamKpiAverages: string | null
    coachingEntries: string | null
    qaObservations: string | null
    escalatedIssues: string | null
    highlights: string | null
    lowlights: string | null
    actionPlan: string | null
    managerReview: string | null
    status: string | null
    supervisorFeedback: string | null
    reviewedById: string | null
    reviewedAt: Date | null
    sourceType: string | null
    sourceFileId: string | null
    verificationStatus: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ReportMaxAggregateOutputType = {
    id: string | null
    ref: string | null
    type: string | null
    reportDate: Date | null
    userId: string | null
    department: string | null
    shiftTime: string | null
    clockIn: string | null
    clockOut: string | null
    attendanceStatus: string | null
    latenessMins: number | null
    kpiMetrics: string | null
    callLogs: string | null
    challenges: string | null
    escalations: string | null
    additionalActivities: string | null
    emailContext: string | null
    workEntries: string | null
    metricsSummary: string | null
    payload: string | null
    teamName: string | null
    campusLocation: string | null
    agentsManaged: number | null
    attendanceSummary: string | null
    teamKpiAverages: string | null
    coachingEntries: string | null
    qaObservations: string | null
    escalatedIssues: string | null
    highlights: string | null
    lowlights: string | null
    actionPlan: string | null
    managerReview: string | null
    status: string | null
    supervisorFeedback: string | null
    reviewedById: string | null
    reviewedAt: Date | null
    sourceType: string | null
    sourceFileId: string | null
    verificationStatus: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ReportCountAggregateOutputType = {
    id: number
    ref: number
    type: number
    reportDate: number
    userId: number
    department: number
    shiftTime: number
    clockIn: number
    clockOut: number
    attendanceStatus: number
    latenessMins: number
    kpiMetrics: number
    callLogs: number
    challenges: number
    escalations: number
    additionalActivities: number
    emailContext: number
    workEntries: number
    metricsSummary: number
    payload: number
    teamName: number
    campusLocation: number
    agentsManaged: number
    attendanceSummary: number
    teamKpiAverages: number
    coachingEntries: number
    qaObservations: number
    escalatedIssues: number
    highlights: number
    lowlights: number
    actionPlan: number
    managerReview: number
    status: number
    supervisorFeedback: number
    reviewedById: number
    reviewedAt: number
    sourceType: number
    sourceFileId: number
    verificationStatus: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ReportAvgAggregateInputType = {
    latenessMins?: true
    agentsManaged?: true
  }

  export type ReportSumAggregateInputType = {
    latenessMins?: true
    agentsManaged?: true
  }

  export type ReportMinAggregateInputType = {
    id?: true
    ref?: true
    type?: true
    reportDate?: true
    userId?: true
    department?: true
    shiftTime?: true
    clockIn?: true
    clockOut?: true
    attendanceStatus?: true
    latenessMins?: true
    kpiMetrics?: true
    callLogs?: true
    challenges?: true
    escalations?: true
    additionalActivities?: true
    emailContext?: true
    workEntries?: true
    metricsSummary?: true
    payload?: true
    teamName?: true
    campusLocation?: true
    agentsManaged?: true
    attendanceSummary?: true
    teamKpiAverages?: true
    coachingEntries?: true
    qaObservations?: true
    escalatedIssues?: true
    highlights?: true
    lowlights?: true
    actionPlan?: true
    managerReview?: true
    status?: true
    supervisorFeedback?: true
    reviewedById?: true
    reviewedAt?: true
    sourceType?: true
    sourceFileId?: true
    verificationStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ReportMaxAggregateInputType = {
    id?: true
    ref?: true
    type?: true
    reportDate?: true
    userId?: true
    department?: true
    shiftTime?: true
    clockIn?: true
    clockOut?: true
    attendanceStatus?: true
    latenessMins?: true
    kpiMetrics?: true
    callLogs?: true
    challenges?: true
    escalations?: true
    additionalActivities?: true
    emailContext?: true
    workEntries?: true
    metricsSummary?: true
    payload?: true
    teamName?: true
    campusLocation?: true
    agentsManaged?: true
    attendanceSummary?: true
    teamKpiAverages?: true
    coachingEntries?: true
    qaObservations?: true
    escalatedIssues?: true
    highlights?: true
    lowlights?: true
    actionPlan?: true
    managerReview?: true
    status?: true
    supervisorFeedback?: true
    reviewedById?: true
    reviewedAt?: true
    sourceType?: true
    sourceFileId?: true
    verificationStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ReportCountAggregateInputType = {
    id?: true
    ref?: true
    type?: true
    reportDate?: true
    userId?: true
    department?: true
    shiftTime?: true
    clockIn?: true
    clockOut?: true
    attendanceStatus?: true
    latenessMins?: true
    kpiMetrics?: true
    callLogs?: true
    challenges?: true
    escalations?: true
    additionalActivities?: true
    emailContext?: true
    workEntries?: true
    metricsSummary?: true
    payload?: true
    teamName?: true
    campusLocation?: true
    agentsManaged?: true
    attendanceSummary?: true
    teamKpiAverages?: true
    coachingEntries?: true
    qaObservations?: true
    escalatedIssues?: true
    highlights?: true
    lowlights?: true
    actionPlan?: true
    managerReview?: true
    status?: true
    supervisorFeedback?: true
    reviewedById?: true
    reviewedAt?: true
    sourceType?: true
    sourceFileId?: true
    verificationStatus?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ReportAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Report to aggregate.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Reports
    **/
    _count?: true | ReportCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReportAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReportSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportMaxAggregateInputType
  }

  export type GetReportAggregateType<T extends ReportAggregateArgs> = {
        [P in keyof T & keyof AggregateReport]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReport[P]>
      : GetScalarType<T[P], AggregateReport[P]>
  }




  export type ReportGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportWhereInput
    orderBy?: ReportOrderByWithAggregationInput | ReportOrderByWithAggregationInput[]
    by: ReportScalarFieldEnum[] | ReportScalarFieldEnum
    having?: ReportScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportCountAggregateInputType | true
    _avg?: ReportAvgAggregateInputType
    _sum?: ReportSumAggregateInputType
    _min?: ReportMinAggregateInputType
    _max?: ReportMaxAggregateInputType
  }

  export type ReportGroupByOutputType = {
    id: string
    ref: string
    type: string
    reportDate: Date
    userId: string
    department: string
    shiftTime: string | null
    clockIn: string | null
    clockOut: string | null
    attendanceStatus: string | null
    latenessMins: number | null
    kpiMetrics: string | null
    callLogs: string | null
    challenges: string | null
    escalations: string | null
    additionalActivities: string | null
    emailContext: string | null
    workEntries: string | null
    metricsSummary: string | null
    payload: string | null
    teamName: string | null
    campusLocation: string | null
    agentsManaged: number | null
    attendanceSummary: string | null
    teamKpiAverages: string | null
    coachingEntries: string | null
    qaObservations: string | null
    escalatedIssues: string | null
    highlights: string | null
    lowlights: string | null
    actionPlan: string | null
    managerReview: string | null
    status: string
    supervisorFeedback: string | null
    reviewedById: string | null
    reviewedAt: Date | null
    sourceType: string
    sourceFileId: string | null
    verificationStatus: string
    createdAt: Date
    updatedAt: Date
    _count: ReportCountAggregateOutputType | null
    _avg: ReportAvgAggregateOutputType | null
    _sum: ReportSumAggregateOutputType | null
    _min: ReportMinAggregateOutputType | null
    _max: ReportMaxAggregateOutputType | null
  }

  type GetReportGroupByPayload<T extends ReportGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportGroupByOutputType[P]>
            : GetScalarType<T[P], ReportGroupByOutputType[P]>
        }
      >
    >


  export type ReportSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ref?: boolean
    type?: boolean
    reportDate?: boolean
    userId?: boolean
    department?: boolean
    shiftTime?: boolean
    clockIn?: boolean
    clockOut?: boolean
    attendanceStatus?: boolean
    latenessMins?: boolean
    kpiMetrics?: boolean
    callLogs?: boolean
    challenges?: boolean
    escalations?: boolean
    additionalActivities?: boolean
    emailContext?: boolean
    workEntries?: boolean
    metricsSummary?: boolean
    payload?: boolean
    teamName?: boolean
    campusLocation?: boolean
    agentsManaged?: boolean
    attendanceSummary?: boolean
    teamKpiAverages?: boolean
    coachingEntries?: boolean
    qaObservations?: boolean
    escalatedIssues?: boolean
    highlights?: boolean
    lowlights?: boolean
    actionPlan?: boolean
    managerReview?: boolean
    status?: boolean
    supervisorFeedback?: boolean
    reviewedById?: boolean
    reviewedAt?: boolean
    sourceType?: boolean
    sourceFileId?: boolean
    verificationStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }, ExtArgs["result"]["report"]>

  export type ReportSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ref?: boolean
    type?: boolean
    reportDate?: boolean
    userId?: boolean
    department?: boolean
    shiftTime?: boolean
    clockIn?: boolean
    clockOut?: boolean
    attendanceStatus?: boolean
    latenessMins?: boolean
    kpiMetrics?: boolean
    callLogs?: boolean
    challenges?: boolean
    escalations?: boolean
    additionalActivities?: boolean
    emailContext?: boolean
    workEntries?: boolean
    metricsSummary?: boolean
    payload?: boolean
    teamName?: boolean
    campusLocation?: boolean
    agentsManaged?: boolean
    attendanceSummary?: boolean
    teamKpiAverages?: boolean
    coachingEntries?: boolean
    qaObservations?: boolean
    escalatedIssues?: boolean
    highlights?: boolean
    lowlights?: boolean
    actionPlan?: boolean
    managerReview?: boolean
    status?: boolean
    supervisorFeedback?: boolean
    reviewedById?: boolean
    reviewedAt?: boolean
    sourceType?: boolean
    sourceFileId?: boolean
    verificationStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }, ExtArgs["result"]["report"]>

  export type ReportSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ref?: boolean
    type?: boolean
    reportDate?: boolean
    userId?: boolean
    department?: boolean
    shiftTime?: boolean
    clockIn?: boolean
    clockOut?: boolean
    attendanceStatus?: boolean
    latenessMins?: boolean
    kpiMetrics?: boolean
    callLogs?: boolean
    challenges?: boolean
    escalations?: boolean
    additionalActivities?: boolean
    emailContext?: boolean
    workEntries?: boolean
    metricsSummary?: boolean
    payload?: boolean
    teamName?: boolean
    campusLocation?: boolean
    agentsManaged?: boolean
    attendanceSummary?: boolean
    teamKpiAverages?: boolean
    coachingEntries?: boolean
    qaObservations?: boolean
    escalatedIssues?: boolean
    highlights?: boolean
    lowlights?: boolean
    actionPlan?: boolean
    managerReview?: boolean
    status?: boolean
    supervisorFeedback?: boolean
    reviewedById?: boolean
    reviewedAt?: boolean
    sourceType?: boolean
    sourceFileId?: boolean
    verificationStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }, ExtArgs["result"]["report"]>

  export type ReportSelectScalar = {
    id?: boolean
    ref?: boolean
    type?: boolean
    reportDate?: boolean
    userId?: boolean
    department?: boolean
    shiftTime?: boolean
    clockIn?: boolean
    clockOut?: boolean
    attendanceStatus?: boolean
    latenessMins?: boolean
    kpiMetrics?: boolean
    callLogs?: boolean
    challenges?: boolean
    escalations?: boolean
    additionalActivities?: boolean
    emailContext?: boolean
    workEntries?: boolean
    metricsSummary?: boolean
    payload?: boolean
    teamName?: boolean
    campusLocation?: boolean
    agentsManaged?: boolean
    attendanceSummary?: boolean
    teamKpiAverages?: boolean
    coachingEntries?: boolean
    qaObservations?: boolean
    escalatedIssues?: boolean
    highlights?: boolean
    lowlights?: boolean
    actionPlan?: boolean
    managerReview?: boolean
    status?: boolean
    supervisorFeedback?: boolean
    reviewedById?: boolean
    reviewedAt?: boolean
    sourceType?: boolean
    sourceFileId?: boolean
    verificationStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ReportOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ref" | "type" | "reportDate" | "userId" | "department" | "shiftTime" | "clockIn" | "clockOut" | "attendanceStatus" | "latenessMins" | "kpiMetrics" | "callLogs" | "challenges" | "escalations" | "additionalActivities" | "emailContext" | "workEntries" | "metricsSummary" | "payload" | "teamName" | "campusLocation" | "agentsManaged" | "attendanceSummary" | "teamKpiAverages" | "coachingEntries" | "qaObservations" | "escalatedIssues" | "highlights" | "lowlights" | "actionPlan" | "managerReview" | "status" | "supervisorFeedback" | "reviewedById" | "reviewedAt" | "sourceType" | "sourceFileId" | "verificationStatus" | "createdAt" | "updatedAt", ExtArgs["result"]["report"]>
  export type ReportInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }
  export type ReportIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }
  export type ReportIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviewer?: boolean | Report$reviewerArgs<ExtArgs>
  }

  export type $ReportPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Report"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      reviewer: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      ref: string
      type: string
      reportDate: Date
      userId: string
      department: string
      shiftTime: string | null
      clockIn: string | null
      clockOut: string | null
      attendanceStatus: string | null
      latenessMins: number | null
      kpiMetrics: string | null
      callLogs: string | null
      challenges: string | null
      escalations: string | null
      additionalActivities: string | null
      emailContext: string | null
      workEntries: string | null
      metricsSummary: string | null
      payload: string | null
      teamName: string | null
      campusLocation: string | null
      agentsManaged: number | null
      attendanceSummary: string | null
      teamKpiAverages: string | null
      coachingEntries: string | null
      qaObservations: string | null
      escalatedIssues: string | null
      highlights: string | null
      lowlights: string | null
      actionPlan: string | null
      managerReview: string | null
      status: string
      supervisorFeedback: string | null
      reviewedById: string | null
      reviewedAt: Date | null
      sourceType: string
      sourceFileId: string | null
      verificationStatus: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["report"]>
    composites: {}
  }

  type ReportGetPayload<S extends boolean | null | undefined | ReportDefaultArgs> = $Result.GetResult<Prisma.$ReportPayload, S>

  type ReportCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ReportFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ReportCountAggregateInputType | true
    }

  export interface ReportDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Report'], meta: { name: 'Report' } }
    /**
     * Find zero or one Report that matches the filter.
     * @param {ReportFindUniqueArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportFindUniqueArgs>(args: SelectSubset<T, ReportFindUniqueArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Report that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ReportFindUniqueOrThrowArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Report that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindFirstArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportFindFirstArgs>(args?: SelectSubset<T, ReportFindFirstArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Report that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindFirstOrThrowArgs} args - Arguments to find a Report
     * @example
     * // Get one Report
     * const report = await prisma.report.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Reports that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Reports
     * const reports = await prisma.report.findMany()
     * 
     * // Get first 10 Reports
     * const reports = await prisma.report.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportWithIdOnly = await prisma.report.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportFindManyArgs>(args?: SelectSubset<T, ReportFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Report.
     * @param {ReportCreateArgs} args - Arguments to create a Report.
     * @example
     * // Create one Report
     * const Report = await prisma.report.create({
     *   data: {
     *     // ... data to create a Report
     *   }
     * })
     * 
     */
    create<T extends ReportCreateArgs>(args: SelectSubset<T, ReportCreateArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Reports.
     * @param {ReportCreateManyArgs} args - Arguments to create many Reports.
     * @example
     * // Create many Reports
     * const report = await prisma.report.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportCreateManyArgs>(args?: SelectSubset<T, ReportCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Reports and returns the data saved in the database.
     * @param {ReportCreateManyAndReturnArgs} args - Arguments to create many Reports.
     * @example
     * // Create many Reports
     * const report = await prisma.report.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Reports and only return the `id`
     * const reportWithIdOnly = await prisma.report.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Report.
     * @param {ReportDeleteArgs} args - Arguments to delete one Report.
     * @example
     * // Delete one Report
     * const Report = await prisma.report.delete({
     *   where: {
     *     // ... filter to delete one Report
     *   }
     * })
     * 
     */
    delete<T extends ReportDeleteArgs>(args: SelectSubset<T, ReportDeleteArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Report.
     * @param {ReportUpdateArgs} args - Arguments to update one Report.
     * @example
     * // Update one Report
     * const report = await prisma.report.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportUpdateArgs>(args: SelectSubset<T, ReportUpdateArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Reports.
     * @param {ReportDeleteManyArgs} args - Arguments to filter Reports to delete.
     * @example
     * // Delete a few Reports
     * const { count } = await prisma.report.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportDeleteManyArgs>(args?: SelectSubset<T, ReportDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Reports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Reports
     * const report = await prisma.report.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportUpdateManyArgs>(args: SelectSubset<T, ReportUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Reports and returns the data updated in the database.
     * @param {ReportUpdateManyAndReturnArgs} args - Arguments to update many Reports.
     * @example
     * // Update many Reports
     * const report = await prisma.report.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Reports and only return the `id`
     * const reportWithIdOnly = await prisma.report.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ReportUpdateManyAndReturnArgs>(args: SelectSubset<T, ReportUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Report.
     * @param {ReportUpsertArgs} args - Arguments to update or create a Report.
     * @example
     * // Update or create a Report
     * const report = await prisma.report.upsert({
     *   create: {
     *     // ... data to create a Report
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Report we want to update
     *   }
     * })
     */
    upsert<T extends ReportUpsertArgs>(args: SelectSubset<T, ReportUpsertArgs<ExtArgs>>): Prisma__ReportClient<$Result.GetResult<Prisma.$ReportPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Reports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportCountArgs} args - Arguments to filter Reports to count.
     * @example
     * // Count the number of Reports
     * const count = await prisma.report.count({
     *   where: {
     *     // ... the filter for the Reports we want to count
     *   }
     * })
    **/
    count<T extends ReportCountArgs>(
      args?: Subset<T, ReportCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Report.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportAggregateArgs>(args: Subset<T, ReportAggregateArgs>): Prisma.PrismaPromise<GetReportAggregateType<T>>

    /**
     * Group by Report.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportGroupByArgs['orderBy'] }
        : { orderBy?: ReportGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Report model
   */
  readonly fields: ReportFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Report.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    reviewer<T extends Report$reviewerArgs<ExtArgs> = {}>(args?: Subset<T, Report$reviewerArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Report model
   */
  interface ReportFieldRefs {
    readonly id: FieldRef<"Report", 'String'>
    readonly ref: FieldRef<"Report", 'String'>
    readonly type: FieldRef<"Report", 'String'>
    readonly reportDate: FieldRef<"Report", 'DateTime'>
    readonly userId: FieldRef<"Report", 'String'>
    readonly department: FieldRef<"Report", 'String'>
    readonly shiftTime: FieldRef<"Report", 'String'>
    readonly clockIn: FieldRef<"Report", 'String'>
    readonly clockOut: FieldRef<"Report", 'String'>
    readonly attendanceStatus: FieldRef<"Report", 'String'>
    readonly latenessMins: FieldRef<"Report", 'Int'>
    readonly kpiMetrics: FieldRef<"Report", 'String'>
    readonly callLogs: FieldRef<"Report", 'String'>
    readonly challenges: FieldRef<"Report", 'String'>
    readonly escalations: FieldRef<"Report", 'String'>
    readonly additionalActivities: FieldRef<"Report", 'String'>
    readonly emailContext: FieldRef<"Report", 'String'>
    readonly workEntries: FieldRef<"Report", 'String'>
    readonly metricsSummary: FieldRef<"Report", 'String'>
    readonly payload: FieldRef<"Report", 'String'>
    readonly teamName: FieldRef<"Report", 'String'>
    readonly campusLocation: FieldRef<"Report", 'String'>
    readonly agentsManaged: FieldRef<"Report", 'Int'>
    readonly attendanceSummary: FieldRef<"Report", 'String'>
    readonly teamKpiAverages: FieldRef<"Report", 'String'>
    readonly coachingEntries: FieldRef<"Report", 'String'>
    readonly qaObservations: FieldRef<"Report", 'String'>
    readonly escalatedIssues: FieldRef<"Report", 'String'>
    readonly highlights: FieldRef<"Report", 'String'>
    readonly lowlights: FieldRef<"Report", 'String'>
    readonly actionPlan: FieldRef<"Report", 'String'>
    readonly managerReview: FieldRef<"Report", 'String'>
    readonly status: FieldRef<"Report", 'String'>
    readonly supervisorFeedback: FieldRef<"Report", 'String'>
    readonly reviewedById: FieldRef<"Report", 'String'>
    readonly reviewedAt: FieldRef<"Report", 'DateTime'>
    readonly sourceType: FieldRef<"Report", 'String'>
    readonly sourceFileId: FieldRef<"Report", 'String'>
    readonly verificationStatus: FieldRef<"Report", 'String'>
    readonly createdAt: FieldRef<"Report", 'DateTime'>
    readonly updatedAt: FieldRef<"Report", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Report findUnique
   */
  export type ReportFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report findUniqueOrThrow
   */
  export type ReportFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report findFirst
   */
  export type ReportFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Reports.
     */
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report findFirstOrThrow
   */
  export type ReportFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Report to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Reports.
     */
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report findMany
   */
  export type ReportFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter, which Reports to fetch.
     */
    where?: ReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Reports to fetch.
     */
    orderBy?: ReportOrderByWithRelationInput | ReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Reports.
     */
    cursor?: ReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Reports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Reports.
     */
    skip?: number
    distinct?: ReportScalarFieldEnum | ReportScalarFieldEnum[]
  }

  /**
   * Report create
   */
  export type ReportCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The data needed to create a Report.
     */
    data: XOR<ReportCreateInput, ReportUncheckedCreateInput>
  }

  /**
   * Report createMany
   */
  export type ReportCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Reports.
     */
    data: ReportCreateManyInput | ReportCreateManyInput[]
  }

  /**
   * Report createManyAndReturn
   */
  export type ReportCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * The data used to create many Reports.
     */
    data: ReportCreateManyInput | ReportCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Report update
   */
  export type ReportUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The data needed to update a Report.
     */
    data: XOR<ReportUpdateInput, ReportUncheckedUpdateInput>
    /**
     * Choose, which Report to update.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report updateMany
   */
  export type ReportUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Reports.
     */
    data: XOR<ReportUpdateManyMutationInput, ReportUncheckedUpdateManyInput>
    /**
     * Filter which Reports to update
     */
    where?: ReportWhereInput
    /**
     * Limit how many Reports to update.
     */
    limit?: number
  }

  /**
   * Report updateManyAndReturn
   */
  export type ReportUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * The data used to update Reports.
     */
    data: XOR<ReportUpdateManyMutationInput, ReportUncheckedUpdateManyInput>
    /**
     * Filter which Reports to update
     */
    where?: ReportWhereInput
    /**
     * Limit how many Reports to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Report upsert
   */
  export type ReportUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * The filter to search for the Report to update in case it exists.
     */
    where: ReportWhereUniqueInput
    /**
     * In case the Report found by the `where` argument doesn't exist, create a new Report with this data.
     */
    create: XOR<ReportCreateInput, ReportUncheckedCreateInput>
    /**
     * In case the Report was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportUpdateInput, ReportUncheckedUpdateInput>
  }

  /**
   * Report delete
   */
  export type ReportDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
    /**
     * Filter which Report to delete.
     */
    where: ReportWhereUniqueInput
  }

  /**
   * Report deleteMany
   */
  export type ReportDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Reports to delete
     */
    where?: ReportWhereInput
    /**
     * Limit how many Reports to delete.
     */
    limit?: number
  }

  /**
   * Report.reviewer
   */
  export type Report$reviewerArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Report without action
   */
  export type ReportDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Report
     */
    select?: ReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Report
     */
    omit?: ReportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportInclude<ExtArgs> | null
  }


  /**
   * Model ReportTemplate
   */

  export type AggregateReportTemplate = {
    _count: ReportTemplateCountAggregateOutputType | null
    _min: ReportTemplateMinAggregateOutputType | null
    _max: ReportTemplateMaxAggregateOutputType | null
  }

  export type ReportTemplateMinAggregateOutputType = {
    id: string | null
    key: string | null
    name: string | null
    description: string | null
    definition: string | null
    updatedById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ReportTemplateMaxAggregateOutputType = {
    id: string | null
    key: string | null
    name: string | null
    description: string | null
    definition: string | null
    updatedById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ReportTemplateCountAggregateOutputType = {
    id: number
    key: number
    name: number
    description: number
    definition: number
    updatedById: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ReportTemplateMinAggregateInputType = {
    id?: true
    key?: true
    name?: true
    description?: true
    definition?: true
    updatedById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ReportTemplateMaxAggregateInputType = {
    id?: true
    key?: true
    name?: true
    description?: true
    definition?: true
    updatedById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ReportTemplateCountAggregateInputType = {
    id?: true
    key?: true
    name?: true
    description?: true
    definition?: true
    updatedById?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ReportTemplateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportTemplate to aggregate.
     */
    where?: ReportTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportTemplates to fetch.
     */
    orderBy?: ReportTemplateOrderByWithRelationInput | ReportTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReportTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ReportTemplates
    **/
    _count?: true | ReportTemplateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReportTemplateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReportTemplateMaxAggregateInputType
  }

  export type GetReportTemplateAggregateType<T extends ReportTemplateAggregateArgs> = {
        [P in keyof T & keyof AggregateReportTemplate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReportTemplate[P]>
      : GetScalarType<T[P], AggregateReportTemplate[P]>
  }




  export type ReportTemplateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReportTemplateWhereInput
    orderBy?: ReportTemplateOrderByWithAggregationInput | ReportTemplateOrderByWithAggregationInput[]
    by: ReportTemplateScalarFieldEnum[] | ReportTemplateScalarFieldEnum
    having?: ReportTemplateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReportTemplateCountAggregateInputType | true
    _min?: ReportTemplateMinAggregateInputType
    _max?: ReportTemplateMaxAggregateInputType
  }

  export type ReportTemplateGroupByOutputType = {
    id: string
    key: string
    name: string
    description: string | null
    definition: string
    updatedById: string | null
    createdAt: Date
    updatedAt: Date
    _count: ReportTemplateCountAggregateOutputType | null
    _min: ReportTemplateMinAggregateOutputType | null
    _max: ReportTemplateMaxAggregateOutputType | null
  }

  type GetReportTemplateGroupByPayload<T extends ReportTemplateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReportTemplateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReportTemplateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReportTemplateGroupByOutputType[P]>
            : GetScalarType<T[P], ReportTemplateGroupByOutputType[P]>
        }
      >
    >


  export type ReportTemplateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    name?: boolean
    description?: boolean
    definition?: boolean
    updatedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }, ExtArgs["result"]["reportTemplate"]>

  export type ReportTemplateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    name?: boolean
    description?: boolean
    definition?: boolean
    updatedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }, ExtArgs["result"]["reportTemplate"]>

  export type ReportTemplateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    name?: boolean
    description?: boolean
    definition?: boolean
    updatedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }, ExtArgs["result"]["reportTemplate"]>

  export type ReportTemplateSelectScalar = {
    id?: boolean
    key?: boolean
    name?: boolean
    description?: boolean
    definition?: boolean
    updatedById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ReportTemplateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "name" | "description" | "definition" | "updatedById" | "createdAt" | "updatedAt", ExtArgs["result"]["reportTemplate"]>
  export type ReportTemplateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }
  export type ReportTemplateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }
  export type ReportTemplateIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    updatedBy?: boolean | ReportTemplate$updatedByArgs<ExtArgs>
  }

  export type $ReportTemplatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ReportTemplate"
    objects: {
      updatedBy: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      key: string
      name: string
      description: string | null
      definition: string
      updatedById: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["reportTemplate"]>
    composites: {}
  }

  type ReportTemplateGetPayload<S extends boolean | null | undefined | ReportTemplateDefaultArgs> = $Result.GetResult<Prisma.$ReportTemplatePayload, S>

  type ReportTemplateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ReportTemplateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ReportTemplateCountAggregateInputType | true
    }

  export interface ReportTemplateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ReportTemplate'], meta: { name: 'ReportTemplate' } }
    /**
     * Find zero or one ReportTemplate that matches the filter.
     * @param {ReportTemplateFindUniqueArgs} args - Arguments to find a ReportTemplate
     * @example
     * // Get one ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReportTemplateFindUniqueArgs>(args: SelectSubset<T, ReportTemplateFindUniqueArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ReportTemplate that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ReportTemplateFindUniqueOrThrowArgs} args - Arguments to find a ReportTemplate
     * @example
     * // Get one ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReportTemplateFindUniqueOrThrowArgs>(args: SelectSubset<T, ReportTemplateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ReportTemplate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateFindFirstArgs} args - Arguments to find a ReportTemplate
     * @example
     * // Get one ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReportTemplateFindFirstArgs>(args?: SelectSubset<T, ReportTemplateFindFirstArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ReportTemplate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateFindFirstOrThrowArgs} args - Arguments to find a ReportTemplate
     * @example
     * // Get one ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReportTemplateFindFirstOrThrowArgs>(args?: SelectSubset<T, ReportTemplateFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ReportTemplates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ReportTemplates
     * const reportTemplates = await prisma.reportTemplate.findMany()
     * 
     * // Get first 10 ReportTemplates
     * const reportTemplates = await prisma.reportTemplate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reportTemplateWithIdOnly = await prisma.reportTemplate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReportTemplateFindManyArgs>(args?: SelectSubset<T, ReportTemplateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ReportTemplate.
     * @param {ReportTemplateCreateArgs} args - Arguments to create a ReportTemplate.
     * @example
     * // Create one ReportTemplate
     * const ReportTemplate = await prisma.reportTemplate.create({
     *   data: {
     *     // ... data to create a ReportTemplate
     *   }
     * })
     * 
     */
    create<T extends ReportTemplateCreateArgs>(args: SelectSubset<T, ReportTemplateCreateArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ReportTemplates.
     * @param {ReportTemplateCreateManyArgs} args - Arguments to create many ReportTemplates.
     * @example
     * // Create many ReportTemplates
     * const reportTemplate = await prisma.reportTemplate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReportTemplateCreateManyArgs>(args?: SelectSubset<T, ReportTemplateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ReportTemplates and returns the data saved in the database.
     * @param {ReportTemplateCreateManyAndReturnArgs} args - Arguments to create many ReportTemplates.
     * @example
     * // Create many ReportTemplates
     * const reportTemplate = await prisma.reportTemplate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ReportTemplates and only return the `id`
     * const reportTemplateWithIdOnly = await prisma.reportTemplate.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReportTemplateCreateManyAndReturnArgs>(args?: SelectSubset<T, ReportTemplateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ReportTemplate.
     * @param {ReportTemplateDeleteArgs} args - Arguments to delete one ReportTemplate.
     * @example
     * // Delete one ReportTemplate
     * const ReportTemplate = await prisma.reportTemplate.delete({
     *   where: {
     *     // ... filter to delete one ReportTemplate
     *   }
     * })
     * 
     */
    delete<T extends ReportTemplateDeleteArgs>(args: SelectSubset<T, ReportTemplateDeleteArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ReportTemplate.
     * @param {ReportTemplateUpdateArgs} args - Arguments to update one ReportTemplate.
     * @example
     * // Update one ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReportTemplateUpdateArgs>(args: SelectSubset<T, ReportTemplateUpdateArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ReportTemplates.
     * @param {ReportTemplateDeleteManyArgs} args - Arguments to filter ReportTemplates to delete.
     * @example
     * // Delete a few ReportTemplates
     * const { count } = await prisma.reportTemplate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReportTemplateDeleteManyArgs>(args?: SelectSubset<T, ReportTemplateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportTemplates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ReportTemplates
     * const reportTemplate = await prisma.reportTemplate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReportTemplateUpdateManyArgs>(args: SelectSubset<T, ReportTemplateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReportTemplates and returns the data updated in the database.
     * @param {ReportTemplateUpdateManyAndReturnArgs} args - Arguments to update many ReportTemplates.
     * @example
     * // Update many ReportTemplates
     * const reportTemplate = await prisma.reportTemplate.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ReportTemplates and only return the `id`
     * const reportTemplateWithIdOnly = await prisma.reportTemplate.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ReportTemplateUpdateManyAndReturnArgs>(args: SelectSubset<T, ReportTemplateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ReportTemplate.
     * @param {ReportTemplateUpsertArgs} args - Arguments to update or create a ReportTemplate.
     * @example
     * // Update or create a ReportTemplate
     * const reportTemplate = await prisma.reportTemplate.upsert({
     *   create: {
     *     // ... data to create a ReportTemplate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ReportTemplate we want to update
     *   }
     * })
     */
    upsert<T extends ReportTemplateUpsertArgs>(args: SelectSubset<T, ReportTemplateUpsertArgs<ExtArgs>>): Prisma__ReportTemplateClient<$Result.GetResult<Prisma.$ReportTemplatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ReportTemplates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateCountArgs} args - Arguments to filter ReportTemplates to count.
     * @example
     * // Count the number of ReportTemplates
     * const count = await prisma.reportTemplate.count({
     *   where: {
     *     // ... the filter for the ReportTemplates we want to count
     *   }
     * })
    **/
    count<T extends ReportTemplateCountArgs>(
      args?: Subset<T, ReportTemplateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReportTemplateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ReportTemplate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReportTemplateAggregateArgs>(args: Subset<T, ReportTemplateAggregateArgs>): Prisma.PrismaPromise<GetReportTemplateAggregateType<T>>

    /**
     * Group by ReportTemplate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReportTemplateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReportTemplateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReportTemplateGroupByArgs['orderBy'] }
        : { orderBy?: ReportTemplateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReportTemplateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReportTemplateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ReportTemplate model
   */
  readonly fields: ReportTemplateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ReportTemplate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReportTemplateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    updatedBy<T extends ReportTemplate$updatedByArgs<ExtArgs> = {}>(args?: Subset<T, ReportTemplate$updatedByArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ReportTemplate model
   */
  interface ReportTemplateFieldRefs {
    readonly id: FieldRef<"ReportTemplate", 'String'>
    readonly key: FieldRef<"ReportTemplate", 'String'>
    readonly name: FieldRef<"ReportTemplate", 'String'>
    readonly description: FieldRef<"ReportTemplate", 'String'>
    readonly definition: FieldRef<"ReportTemplate", 'String'>
    readonly updatedById: FieldRef<"ReportTemplate", 'String'>
    readonly createdAt: FieldRef<"ReportTemplate", 'DateTime'>
    readonly updatedAt: FieldRef<"ReportTemplate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ReportTemplate findUnique
   */
  export type ReportTemplateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter, which ReportTemplate to fetch.
     */
    where: ReportTemplateWhereUniqueInput
  }

  /**
   * ReportTemplate findUniqueOrThrow
   */
  export type ReportTemplateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter, which ReportTemplate to fetch.
     */
    where: ReportTemplateWhereUniqueInput
  }

  /**
   * ReportTemplate findFirst
   */
  export type ReportTemplateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter, which ReportTemplate to fetch.
     */
    where?: ReportTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportTemplates to fetch.
     */
    orderBy?: ReportTemplateOrderByWithRelationInput | ReportTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportTemplates.
     */
    cursor?: ReportTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportTemplates.
     */
    distinct?: ReportTemplateScalarFieldEnum | ReportTemplateScalarFieldEnum[]
  }

  /**
   * ReportTemplate findFirstOrThrow
   */
  export type ReportTemplateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter, which ReportTemplate to fetch.
     */
    where?: ReportTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportTemplates to fetch.
     */
    orderBy?: ReportTemplateOrderByWithRelationInput | ReportTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReportTemplates.
     */
    cursor?: ReportTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReportTemplates.
     */
    distinct?: ReportTemplateScalarFieldEnum | ReportTemplateScalarFieldEnum[]
  }

  /**
   * ReportTemplate findMany
   */
  export type ReportTemplateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter, which ReportTemplates to fetch.
     */
    where?: ReportTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReportTemplates to fetch.
     */
    orderBy?: ReportTemplateOrderByWithRelationInput | ReportTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ReportTemplates.
     */
    cursor?: ReportTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReportTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReportTemplates.
     */
    skip?: number
    distinct?: ReportTemplateScalarFieldEnum | ReportTemplateScalarFieldEnum[]
  }

  /**
   * ReportTemplate create
   */
  export type ReportTemplateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * The data needed to create a ReportTemplate.
     */
    data: XOR<ReportTemplateCreateInput, ReportTemplateUncheckedCreateInput>
  }

  /**
   * ReportTemplate createMany
   */
  export type ReportTemplateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ReportTemplates.
     */
    data: ReportTemplateCreateManyInput | ReportTemplateCreateManyInput[]
  }

  /**
   * ReportTemplate createManyAndReturn
   */
  export type ReportTemplateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * The data used to create many ReportTemplates.
     */
    data: ReportTemplateCreateManyInput | ReportTemplateCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportTemplate update
   */
  export type ReportTemplateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * The data needed to update a ReportTemplate.
     */
    data: XOR<ReportTemplateUpdateInput, ReportTemplateUncheckedUpdateInput>
    /**
     * Choose, which ReportTemplate to update.
     */
    where: ReportTemplateWhereUniqueInput
  }

  /**
   * ReportTemplate updateMany
   */
  export type ReportTemplateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ReportTemplates.
     */
    data: XOR<ReportTemplateUpdateManyMutationInput, ReportTemplateUncheckedUpdateManyInput>
    /**
     * Filter which ReportTemplates to update
     */
    where?: ReportTemplateWhereInput
    /**
     * Limit how many ReportTemplates to update.
     */
    limit?: number
  }

  /**
   * ReportTemplate updateManyAndReturn
   */
  export type ReportTemplateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * The data used to update ReportTemplates.
     */
    data: XOR<ReportTemplateUpdateManyMutationInput, ReportTemplateUncheckedUpdateManyInput>
    /**
     * Filter which ReportTemplates to update
     */
    where?: ReportTemplateWhereInput
    /**
     * Limit how many ReportTemplates to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReportTemplate upsert
   */
  export type ReportTemplateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * The filter to search for the ReportTemplate to update in case it exists.
     */
    where: ReportTemplateWhereUniqueInput
    /**
     * In case the ReportTemplate found by the `where` argument doesn't exist, create a new ReportTemplate with this data.
     */
    create: XOR<ReportTemplateCreateInput, ReportTemplateUncheckedCreateInput>
    /**
     * In case the ReportTemplate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReportTemplateUpdateInput, ReportTemplateUncheckedUpdateInput>
  }

  /**
   * ReportTemplate delete
   */
  export type ReportTemplateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
    /**
     * Filter which ReportTemplate to delete.
     */
    where: ReportTemplateWhereUniqueInput
  }

  /**
   * ReportTemplate deleteMany
   */
  export type ReportTemplateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReportTemplates to delete
     */
    where?: ReportTemplateWhereInput
    /**
     * Limit how many ReportTemplates to delete.
     */
    limit?: number
  }

  /**
   * ReportTemplate.updatedBy
   */
  export type ReportTemplate$updatedByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * ReportTemplate without action
   */
  export type ReportTemplateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReportTemplate
     */
    select?: ReportTemplateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ReportTemplate
     */
    omit?: ReportTemplateOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReportTemplateInclude<ExtArgs> | null
  }


  /**
   * Model Task
   */

  export type AggregateTask = {
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  export type TaskAvgAggregateOutputType = {
    estimatedHours: number | null
    actualHours: number | null
  }

  export type TaskSumAggregateOutputType = {
    estimatedHours: number | null
    actualHours: number | null
  }

  export type TaskMinAggregateOutputType = {
    id: string | null
    title: string | null
    description: string | null
    department: string | null
    assigneeId: string | null
    createdById: string | null
    category: string | null
    projectRef: string | null
    priority: string | null
    status: string | null
    requiredOutcome: string | null
    target: string | null
    kpiKey: string | null
    dateAssigned: Date | null
    deadline: Date | null
    estimatedHours: number | null
    actualHours: number | null
    blocker: string | null
    nextSteps: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskMaxAggregateOutputType = {
    id: string | null
    title: string | null
    description: string | null
    department: string | null
    assigneeId: string | null
    createdById: string | null
    category: string | null
    projectRef: string | null
    priority: string | null
    status: string | null
    requiredOutcome: string | null
    target: string | null
    kpiKey: string | null
    dateAssigned: Date | null
    deadline: Date | null
    estimatedHours: number | null
    actualHours: number | null
    blocker: string | null
    nextSteps: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskCountAggregateOutputType = {
    id: number
    title: number
    description: number
    department: number
    assigneeId: number
    createdById: number
    category: number
    projectRef: number
    priority: number
    status: number
    requiredOutcome: number
    target: number
    kpiKey: number
    dateAssigned: number
    deadline: number
    estimatedHours: number
    actualHours: number
    blocker: number
    nextSteps: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskAvgAggregateInputType = {
    estimatedHours?: true
    actualHours?: true
  }

  export type TaskSumAggregateInputType = {
    estimatedHours?: true
    actualHours?: true
  }

  export type TaskMinAggregateInputType = {
    id?: true
    title?: true
    description?: true
    department?: true
    assigneeId?: true
    createdById?: true
    category?: true
    projectRef?: true
    priority?: true
    status?: true
    requiredOutcome?: true
    target?: true
    kpiKey?: true
    dateAssigned?: true
    deadline?: true
    estimatedHours?: true
    actualHours?: true
    blocker?: true
    nextSteps?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskMaxAggregateInputType = {
    id?: true
    title?: true
    description?: true
    department?: true
    assigneeId?: true
    createdById?: true
    category?: true
    projectRef?: true
    priority?: true
    status?: true
    requiredOutcome?: true
    target?: true
    kpiKey?: true
    dateAssigned?: true
    deadline?: true
    estimatedHours?: true
    actualHours?: true
    blocker?: true
    nextSteps?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskCountAggregateInputType = {
    id?: true
    title?: true
    description?: true
    department?: true
    assigneeId?: true
    createdById?: true
    category?: true
    projectRef?: true
    priority?: true
    status?: true
    requiredOutcome?: true
    target?: true
    kpiKey?: true
    dateAssigned?: true
    deadline?: true
    estimatedHours?: true
    actualHours?: true
    blocker?: true
    nextSteps?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Task to aggregate.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tasks
    **/
    _count?: true | TaskCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TaskAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TaskSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskMaxAggregateInputType
  }

  export type GetTaskAggregateType<T extends TaskAggregateArgs> = {
        [P in keyof T & keyof AggregateTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTask[P]>
      : GetScalarType<T[P], AggregateTask[P]>
  }




  export type TaskGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithAggregationInput | TaskOrderByWithAggregationInput[]
    by: TaskScalarFieldEnum[] | TaskScalarFieldEnum
    having?: TaskScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskCountAggregateInputType | true
    _avg?: TaskAvgAggregateInputType
    _sum?: TaskSumAggregateInputType
    _min?: TaskMinAggregateInputType
    _max?: TaskMaxAggregateInputType
  }

  export type TaskGroupByOutputType = {
    id: string
    title: string
    description: string | null
    department: string
    assigneeId: string | null
    createdById: string
    category: string | null
    projectRef: string | null
    priority: string
    status: string
    requiredOutcome: string | null
    target: string | null
    kpiKey: string | null
    dateAssigned: Date
    deadline: Date | null
    estimatedHours: number | null
    actualHours: number | null
    blocker: string | null
    nextSteps: string | null
    createdAt: Date
    updatedAt: Date
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  type GetTaskGroupByPayload<T extends TaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskGroupByOutputType[P]>
            : GetScalarType<T[P], TaskGroupByOutputType[P]>
        }
      >
    >


  export type TaskSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    department?: boolean
    assigneeId?: boolean
    createdById?: boolean
    category?: boolean
    projectRef?: boolean
    priority?: boolean
    status?: boolean
    requiredOutcome?: boolean
    target?: boolean
    kpiKey?: boolean
    dateAssigned?: boolean
    deadline?: boolean
    estimatedHours?: boolean
    actualHours?: boolean
    blocker?: boolean
    nextSteps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    department?: boolean
    assigneeId?: boolean
    createdById?: boolean
    category?: boolean
    projectRef?: boolean
    priority?: boolean
    status?: boolean
    requiredOutcome?: boolean
    target?: boolean
    kpiKey?: boolean
    dateAssigned?: boolean
    deadline?: boolean
    estimatedHours?: boolean
    actualHours?: boolean
    blocker?: boolean
    nextSteps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    department?: boolean
    assigneeId?: boolean
    createdById?: boolean
    category?: boolean
    projectRef?: boolean
    priority?: boolean
    status?: boolean
    requiredOutcome?: boolean
    target?: boolean
    kpiKey?: boolean
    dateAssigned?: boolean
    deadline?: boolean
    estimatedHours?: boolean
    actualHours?: boolean
    blocker?: boolean
    nextSteps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectScalar = {
    id?: boolean
    title?: boolean
    description?: boolean
    department?: boolean
    assigneeId?: boolean
    createdById?: boolean
    category?: boolean
    projectRef?: boolean
    priority?: boolean
    status?: boolean
    requiredOutcome?: boolean
    target?: boolean
    kpiKey?: boolean
    dateAssigned?: boolean
    deadline?: boolean
    estimatedHours?: boolean
    actualHours?: boolean
    blocker?: boolean
    nextSteps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "description" | "department" | "assigneeId" | "createdById" | "category" | "projectRef" | "priority" | "status" | "requiredOutcome" | "target" | "kpiKey" | "dateAssigned" | "deadline" | "estimatedHours" | "actualHours" | "blocker" | "nextSteps" | "createdAt" | "updatedAt", ExtArgs["result"]["task"]>
  export type TaskInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type TaskIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type TaskIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignee?: boolean | Task$assigneeArgs<ExtArgs>
    creator?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $TaskPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Task"
    objects: {
      assignee: Prisma.$UserPayload<ExtArgs> | null
      creator: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      description: string | null
      department: string
      assigneeId: string | null
      createdById: string
      category: string | null
      projectRef: string | null
      priority: string
      status: string
      requiredOutcome: string | null
      target: string | null
      kpiKey: string | null
      dateAssigned: Date
      deadline: Date | null
      estimatedHours: number | null
      actualHours: number | null
      blocker: string | null
      nextSteps: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["task"]>
    composites: {}
  }

  type TaskGetPayload<S extends boolean | null | undefined | TaskDefaultArgs> = $Result.GetResult<Prisma.$TaskPayload, S>

  type TaskCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskCountAggregateInputType | true
    }

  export interface TaskDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Task'], meta: { name: 'Task' } }
    /**
     * Find zero or one Task that matches the filter.
     * @param {TaskFindUniqueArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskFindUniqueArgs>(args: SelectSubset<T, TaskFindUniqueArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Task that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskFindUniqueOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskFindFirstArgs>(args?: SelectSubset<T, TaskFindFirstArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.task.findMany()
     * 
     * // Get first 10 Tasks
     * const tasks = await prisma.task.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskWithIdOnly = await prisma.task.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskFindManyArgs>(args?: SelectSubset<T, TaskFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Task.
     * @param {TaskCreateArgs} args - Arguments to create a Task.
     * @example
     * // Create one Task
     * const Task = await prisma.task.create({
     *   data: {
     *     // ... data to create a Task
     *   }
     * })
     * 
     */
    create<T extends TaskCreateArgs>(args: SelectSubset<T, TaskCreateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tasks.
     * @param {TaskCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskCreateManyArgs>(args?: SelectSubset<T, TaskCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {TaskCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Task.
     * @param {TaskDeleteArgs} args - Arguments to delete one Task.
     * @example
     * // Delete one Task
     * const Task = await prisma.task.delete({
     *   where: {
     *     // ... filter to delete one Task
     *   }
     * })
     * 
     */
    delete<T extends TaskDeleteArgs>(args: SelectSubset<T, TaskDeleteArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Task.
     * @param {TaskUpdateArgs} args - Arguments to update one Task.
     * @example
     * // Update one Task
     * const task = await prisma.task.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskUpdateArgs>(args: SelectSubset<T, TaskUpdateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tasks.
     * @param {TaskDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.task.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskDeleteManyArgs>(args?: SelectSubset<T, TaskDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskUpdateManyArgs>(args: SelectSubset<T, TaskUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks and returns the data updated in the database.
     * @param {TaskUpdateManyAndReturnArgs} args - Arguments to update many Tasks.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Task.
     * @param {TaskUpsertArgs} args - Arguments to update or create a Task.
     * @example
     * // Update or create a Task
     * const task = await prisma.task.upsert({
     *   create: {
     *     // ... data to create a Task
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Task we want to update
     *   }
     * })
     */
    upsert<T extends TaskUpsertArgs>(args: SelectSubset<T, TaskUpsertArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.task.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
    **/
    count<T extends TaskCountArgs>(
      args?: Subset<T, TaskCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskAggregateArgs>(args: Subset<T, TaskAggregateArgs>): Prisma.PrismaPromise<GetTaskAggregateType<T>>

    /**
     * Group by Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskGroupByArgs['orderBy'] }
        : { orderBy?: TaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Task model
   */
  readonly fields: TaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Task.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    assignee<T extends Task$assigneeArgs<ExtArgs> = {}>(args?: Subset<T, Task$assigneeArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    creator<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Task model
   */
  interface TaskFieldRefs {
    readonly id: FieldRef<"Task", 'String'>
    readonly title: FieldRef<"Task", 'String'>
    readonly description: FieldRef<"Task", 'String'>
    readonly department: FieldRef<"Task", 'String'>
    readonly assigneeId: FieldRef<"Task", 'String'>
    readonly createdById: FieldRef<"Task", 'String'>
    readonly category: FieldRef<"Task", 'String'>
    readonly projectRef: FieldRef<"Task", 'String'>
    readonly priority: FieldRef<"Task", 'String'>
    readonly status: FieldRef<"Task", 'String'>
    readonly requiredOutcome: FieldRef<"Task", 'String'>
    readonly target: FieldRef<"Task", 'String'>
    readonly kpiKey: FieldRef<"Task", 'String'>
    readonly dateAssigned: FieldRef<"Task", 'DateTime'>
    readonly deadline: FieldRef<"Task", 'DateTime'>
    readonly estimatedHours: FieldRef<"Task", 'Float'>
    readonly actualHours: FieldRef<"Task", 'Float'>
    readonly blocker: FieldRef<"Task", 'String'>
    readonly nextSteps: FieldRef<"Task", 'String'>
    readonly createdAt: FieldRef<"Task", 'DateTime'>
    readonly updatedAt: FieldRef<"Task", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Task findUnique
   */
  export type TaskFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findUniqueOrThrow
   */
  export type TaskFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findFirst
   */
  export type TaskFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findFirstOrThrow
   */
  export type TaskFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findMany
   */
  export type TaskFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Tasks to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task create
   */
  export type TaskCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to create a Task.
     */
    data: XOR<TaskCreateInput, TaskUncheckedCreateInput>
  }

  /**
   * Task createMany
   */
  export type TaskCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
  }

  /**
   * Task createManyAndReturn
   */
  export type TaskCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task update
   */
  export type TaskUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to update a Task.
     */
    data: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
    /**
     * Choose, which Task to update.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task updateMany
   */
  export type TaskUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
  }

  /**
   * Task updateManyAndReturn
   */
  export type TaskUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task upsert
   */
  export type TaskUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The filter to search for the Task to update in case it exists.
     */
    where: TaskWhereUniqueInput
    /**
     * In case the Task found by the `where` argument doesn't exist, create a new Task with this data.
     */
    create: XOR<TaskCreateInput, TaskUncheckedCreateInput>
    /**
     * In case the Task was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
  }

  /**
   * Task delete
   */
  export type TaskDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter which Task to delete.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task deleteMany
   */
  export type TaskDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tasks to delete
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to delete.
     */
    limit?: number
  }

  /**
   * Task.assignee
   */
  export type Task$assigneeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Task without action
   */
  export type TaskDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
  }


  /**
   * Model UploadedFile
   */

  export type AggregateUploadedFile = {
    _count: UploadedFileCountAggregateOutputType | null
    _avg: UploadedFileAvgAggregateOutputType | null
    _sum: UploadedFileSumAggregateOutputType | null
    _min: UploadedFileMinAggregateOutputType | null
    _max: UploadedFileMaxAggregateOutputType | null
  }

  export type UploadedFileAvgAggregateOutputType = {
    sizeBytes: number | null
  }

  export type UploadedFileSumAggregateOutputType = {
    sizeBytes: number | null
  }

  export type UploadedFileMinAggregateOutputType = {
    id: string | null
    originalName: string | null
    storedName: string | null
    mimeType: string | null
    sizeBytes: number | null
    fileHash: string | null
    extractStatus: string | null
    extractError: string | null
    extractedData: string | null
    rawText: string | null
    reportDate: Date | null
    department: string | null
    reportId: string | null
    userId: string | null
    confirmedAt: Date | null
    createdAt: Date | null
  }

  export type UploadedFileMaxAggregateOutputType = {
    id: string | null
    originalName: string | null
    storedName: string | null
    mimeType: string | null
    sizeBytes: number | null
    fileHash: string | null
    extractStatus: string | null
    extractError: string | null
    extractedData: string | null
    rawText: string | null
    reportDate: Date | null
    department: string | null
    reportId: string | null
    userId: string | null
    confirmedAt: Date | null
    createdAt: Date | null
  }

  export type UploadedFileCountAggregateOutputType = {
    id: number
    originalName: number
    storedName: number
    mimeType: number
    sizeBytes: number
    fileHash: number
    extractStatus: number
    extractError: number
    extractedData: number
    rawText: number
    reportDate: number
    department: number
    reportId: number
    userId: number
    confirmedAt: number
    createdAt: number
    _all: number
  }


  export type UploadedFileAvgAggregateInputType = {
    sizeBytes?: true
  }

  export type UploadedFileSumAggregateInputType = {
    sizeBytes?: true
  }

  export type UploadedFileMinAggregateInputType = {
    id?: true
    originalName?: true
    storedName?: true
    mimeType?: true
    sizeBytes?: true
    fileHash?: true
    extractStatus?: true
    extractError?: true
    extractedData?: true
    rawText?: true
    reportDate?: true
    department?: true
    reportId?: true
    userId?: true
    confirmedAt?: true
    createdAt?: true
  }

  export type UploadedFileMaxAggregateInputType = {
    id?: true
    originalName?: true
    storedName?: true
    mimeType?: true
    sizeBytes?: true
    fileHash?: true
    extractStatus?: true
    extractError?: true
    extractedData?: true
    rawText?: true
    reportDate?: true
    department?: true
    reportId?: true
    userId?: true
    confirmedAt?: true
    createdAt?: true
  }

  export type UploadedFileCountAggregateInputType = {
    id?: true
    originalName?: true
    storedName?: true
    mimeType?: true
    sizeBytes?: true
    fileHash?: true
    extractStatus?: true
    extractError?: true
    extractedData?: true
    rawText?: true
    reportDate?: true
    department?: true
    reportId?: true
    userId?: true
    confirmedAt?: true
    createdAt?: true
    _all?: true
  }

  export type UploadedFileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UploadedFile to aggregate.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UploadedFiles
    **/
    _count?: true | UploadedFileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UploadedFileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UploadedFileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UploadedFileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UploadedFileMaxAggregateInputType
  }

  export type GetUploadedFileAggregateType<T extends UploadedFileAggregateArgs> = {
        [P in keyof T & keyof AggregateUploadedFile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUploadedFile[P]>
      : GetScalarType<T[P], AggregateUploadedFile[P]>
  }




  export type UploadedFileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UploadedFileWhereInput
    orderBy?: UploadedFileOrderByWithAggregationInput | UploadedFileOrderByWithAggregationInput[]
    by: UploadedFileScalarFieldEnum[] | UploadedFileScalarFieldEnum
    having?: UploadedFileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UploadedFileCountAggregateInputType | true
    _avg?: UploadedFileAvgAggregateInputType
    _sum?: UploadedFileSumAggregateInputType
    _min?: UploadedFileMinAggregateInputType
    _max?: UploadedFileMaxAggregateInputType
  }

  export type UploadedFileGroupByOutputType = {
    id: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus: string
    extractError: string | null
    extractedData: string | null
    rawText: string | null
    reportDate: Date | null
    department: string | null
    reportId: string | null
    userId: string
    confirmedAt: Date | null
    createdAt: Date
    _count: UploadedFileCountAggregateOutputType | null
    _avg: UploadedFileAvgAggregateOutputType | null
    _sum: UploadedFileSumAggregateOutputType | null
    _min: UploadedFileMinAggregateOutputType | null
    _max: UploadedFileMaxAggregateOutputType | null
  }

  type GetUploadedFileGroupByPayload<T extends UploadedFileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UploadedFileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UploadedFileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UploadedFileGroupByOutputType[P]>
            : GetScalarType<T[P], UploadedFileGroupByOutputType[P]>
        }
      >
    >


  export type UploadedFileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    originalName?: boolean
    storedName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    fileHash?: boolean
    extractStatus?: boolean
    extractError?: boolean
    extractedData?: boolean
    rawText?: boolean
    reportDate?: boolean
    department?: boolean
    reportId?: boolean
    userId?: boolean
    confirmedAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    originalName?: boolean
    storedName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    fileHash?: boolean
    extractStatus?: boolean
    extractError?: boolean
    extractedData?: boolean
    rawText?: boolean
    reportDate?: boolean
    department?: boolean
    reportId?: boolean
    userId?: boolean
    confirmedAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    originalName?: boolean
    storedName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    fileHash?: boolean
    extractStatus?: boolean
    extractError?: boolean
    extractedData?: boolean
    rawText?: boolean
    reportDate?: boolean
    department?: boolean
    reportId?: boolean
    userId?: boolean
    confirmedAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectScalar = {
    id?: boolean
    originalName?: boolean
    storedName?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    fileHash?: boolean
    extractStatus?: boolean
    extractError?: boolean
    extractedData?: boolean
    rawText?: boolean
    reportDate?: boolean
    department?: boolean
    reportId?: boolean
    userId?: boolean
    confirmedAt?: boolean
    createdAt?: boolean
  }

  export type UploadedFileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "originalName" | "storedName" | "mimeType" | "sizeBytes" | "fileHash" | "extractStatus" | "extractError" | "extractedData" | "rawText" | "reportDate" | "department" | "reportId" | "userId" | "confirmedAt" | "createdAt", ExtArgs["result"]["uploadedFile"]>
  export type UploadedFileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UploadedFileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UploadedFileIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UploadedFilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UploadedFile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      originalName: string
      storedName: string
      mimeType: string
      sizeBytes: number
      fileHash: string
      extractStatus: string
      extractError: string | null
      extractedData: string | null
      rawText: string | null
      reportDate: Date | null
      department: string | null
      reportId: string | null
      userId: string
      confirmedAt: Date | null
      createdAt: Date
    }, ExtArgs["result"]["uploadedFile"]>
    composites: {}
  }

  type UploadedFileGetPayload<S extends boolean | null | undefined | UploadedFileDefaultArgs> = $Result.GetResult<Prisma.$UploadedFilePayload, S>

  type UploadedFileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UploadedFileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UploadedFileCountAggregateInputType | true
    }

  export interface UploadedFileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UploadedFile'], meta: { name: 'UploadedFile' } }
    /**
     * Find zero or one UploadedFile that matches the filter.
     * @param {UploadedFileFindUniqueArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UploadedFileFindUniqueArgs>(args: SelectSubset<T, UploadedFileFindUniqueArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UploadedFile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UploadedFileFindUniqueOrThrowArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UploadedFileFindUniqueOrThrowArgs>(args: SelectSubset<T, UploadedFileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UploadedFile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindFirstArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UploadedFileFindFirstArgs>(args?: SelectSubset<T, UploadedFileFindFirstArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UploadedFile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindFirstOrThrowArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UploadedFileFindFirstOrThrowArgs>(args?: SelectSubset<T, UploadedFileFindFirstOrThrowArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UploadedFiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UploadedFiles
     * const uploadedFiles = await prisma.uploadedFile.findMany()
     * 
     * // Get first 10 UploadedFiles
     * const uploadedFiles = await prisma.uploadedFile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UploadedFileFindManyArgs>(args?: SelectSubset<T, UploadedFileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UploadedFile.
     * @param {UploadedFileCreateArgs} args - Arguments to create a UploadedFile.
     * @example
     * // Create one UploadedFile
     * const UploadedFile = await prisma.uploadedFile.create({
     *   data: {
     *     // ... data to create a UploadedFile
     *   }
     * })
     * 
     */
    create<T extends UploadedFileCreateArgs>(args: SelectSubset<T, UploadedFileCreateArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UploadedFiles.
     * @param {UploadedFileCreateManyArgs} args - Arguments to create many UploadedFiles.
     * @example
     * // Create many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UploadedFileCreateManyArgs>(args?: SelectSubset<T, UploadedFileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UploadedFiles and returns the data saved in the database.
     * @param {UploadedFileCreateManyAndReturnArgs} args - Arguments to create many UploadedFiles.
     * @example
     * // Create many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UploadedFiles and only return the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UploadedFileCreateManyAndReturnArgs>(args?: SelectSubset<T, UploadedFileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UploadedFile.
     * @param {UploadedFileDeleteArgs} args - Arguments to delete one UploadedFile.
     * @example
     * // Delete one UploadedFile
     * const UploadedFile = await prisma.uploadedFile.delete({
     *   where: {
     *     // ... filter to delete one UploadedFile
     *   }
     * })
     * 
     */
    delete<T extends UploadedFileDeleteArgs>(args: SelectSubset<T, UploadedFileDeleteArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UploadedFile.
     * @param {UploadedFileUpdateArgs} args - Arguments to update one UploadedFile.
     * @example
     * // Update one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UploadedFileUpdateArgs>(args: SelectSubset<T, UploadedFileUpdateArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UploadedFiles.
     * @param {UploadedFileDeleteManyArgs} args - Arguments to filter UploadedFiles to delete.
     * @example
     * // Delete a few UploadedFiles
     * const { count } = await prisma.uploadedFile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UploadedFileDeleteManyArgs>(args?: SelectSubset<T, UploadedFileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UploadedFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UploadedFileUpdateManyArgs>(args: SelectSubset<T, UploadedFileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UploadedFiles and returns the data updated in the database.
     * @param {UploadedFileUpdateManyAndReturnArgs} args - Arguments to update many UploadedFiles.
     * @example
     * // Update many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UploadedFiles and only return the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UploadedFileUpdateManyAndReturnArgs>(args: SelectSubset<T, UploadedFileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UploadedFile.
     * @param {UploadedFileUpsertArgs} args - Arguments to update or create a UploadedFile.
     * @example
     * // Update or create a UploadedFile
     * const uploadedFile = await prisma.uploadedFile.upsert({
     *   create: {
     *     // ... data to create a UploadedFile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UploadedFile we want to update
     *   }
     * })
     */
    upsert<T extends UploadedFileUpsertArgs>(args: SelectSubset<T, UploadedFileUpsertArgs<ExtArgs>>): Prisma__UploadedFileClient<$Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UploadedFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileCountArgs} args - Arguments to filter UploadedFiles to count.
     * @example
     * // Count the number of UploadedFiles
     * const count = await prisma.uploadedFile.count({
     *   where: {
     *     // ... the filter for the UploadedFiles we want to count
     *   }
     * })
    **/
    count<T extends UploadedFileCountArgs>(
      args?: Subset<T, UploadedFileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UploadedFileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UploadedFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UploadedFileAggregateArgs>(args: Subset<T, UploadedFileAggregateArgs>): Prisma.PrismaPromise<GetUploadedFileAggregateType<T>>

    /**
     * Group by UploadedFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UploadedFileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UploadedFileGroupByArgs['orderBy'] }
        : { orderBy?: UploadedFileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UploadedFileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUploadedFileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UploadedFile model
   */
  readonly fields: UploadedFileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UploadedFile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UploadedFileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UploadedFile model
   */
  interface UploadedFileFieldRefs {
    readonly id: FieldRef<"UploadedFile", 'String'>
    readonly originalName: FieldRef<"UploadedFile", 'String'>
    readonly storedName: FieldRef<"UploadedFile", 'String'>
    readonly mimeType: FieldRef<"UploadedFile", 'String'>
    readonly sizeBytes: FieldRef<"UploadedFile", 'Int'>
    readonly fileHash: FieldRef<"UploadedFile", 'String'>
    readonly extractStatus: FieldRef<"UploadedFile", 'String'>
    readonly extractError: FieldRef<"UploadedFile", 'String'>
    readonly extractedData: FieldRef<"UploadedFile", 'String'>
    readonly rawText: FieldRef<"UploadedFile", 'String'>
    readonly reportDate: FieldRef<"UploadedFile", 'DateTime'>
    readonly department: FieldRef<"UploadedFile", 'String'>
    readonly reportId: FieldRef<"UploadedFile", 'String'>
    readonly userId: FieldRef<"UploadedFile", 'String'>
    readonly confirmedAt: FieldRef<"UploadedFile", 'DateTime'>
    readonly createdAt: FieldRef<"UploadedFile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UploadedFile findUnique
   */
  export type UploadedFileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile findUniqueOrThrow
   */
  export type UploadedFileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile findFirst
   */
  export type UploadedFileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UploadedFiles.
     */
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile findFirstOrThrow
   */
  export type UploadedFileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UploadedFiles.
     */
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile findMany
   */
  export type UploadedFileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFiles to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile create
   */
  export type UploadedFileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The data needed to create a UploadedFile.
     */
    data: XOR<UploadedFileCreateInput, UploadedFileUncheckedCreateInput>
  }

  /**
   * UploadedFile createMany
   */
  export type UploadedFileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UploadedFiles.
     */
    data: UploadedFileCreateManyInput | UploadedFileCreateManyInput[]
  }

  /**
   * UploadedFile createManyAndReturn
   */
  export type UploadedFileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * The data used to create many UploadedFiles.
     */
    data: UploadedFileCreateManyInput | UploadedFileCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UploadedFile update
   */
  export type UploadedFileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The data needed to update a UploadedFile.
     */
    data: XOR<UploadedFileUpdateInput, UploadedFileUncheckedUpdateInput>
    /**
     * Choose, which UploadedFile to update.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile updateMany
   */
  export type UploadedFileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UploadedFiles.
     */
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyInput>
    /**
     * Filter which UploadedFiles to update
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to update.
     */
    limit?: number
  }

  /**
   * UploadedFile updateManyAndReturn
   */
  export type UploadedFileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * The data used to update UploadedFiles.
     */
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyInput>
    /**
     * Filter which UploadedFiles to update
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UploadedFile upsert
   */
  export type UploadedFileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The filter to search for the UploadedFile to update in case it exists.
     */
    where: UploadedFileWhereUniqueInput
    /**
     * In case the UploadedFile found by the `where` argument doesn't exist, create a new UploadedFile with this data.
     */
    create: XOR<UploadedFileCreateInput, UploadedFileUncheckedCreateInput>
    /**
     * In case the UploadedFile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UploadedFileUpdateInput, UploadedFileUncheckedUpdateInput>
  }

  /**
   * UploadedFile delete
   */
  export type UploadedFileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter which UploadedFile to delete.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile deleteMany
   */
  export type UploadedFileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UploadedFiles to delete
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to delete.
     */
    limit?: number
  }

  /**
   * UploadedFile without action
   */
  export type UploadedFileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
  }


  /**
   * Model Notification
   */

  export type AggregateNotification = {
    _count: NotificationCountAggregateOutputType | null
    _min: NotificationMinAggregateOutputType | null
    _max: NotificationMaxAggregateOutputType | null
  }

  export type NotificationMinAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    severity: string | null
    title: string | null
    message: string | null
    linkData: string | null
    read: boolean | null
    dedupeKey: string | null
    createdAt: Date | null
  }

  export type NotificationMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    severity: string | null
    title: string | null
    message: string | null
    linkData: string | null
    read: boolean | null
    dedupeKey: string | null
    createdAt: Date | null
  }

  export type NotificationCountAggregateOutputType = {
    id: number
    userId: number
    type: number
    severity: number
    title: number
    message: number
    linkData: number
    read: number
    dedupeKey: number
    createdAt: number
    _all: number
  }


  export type NotificationMinAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    severity?: true
    title?: true
    message?: true
    linkData?: true
    read?: true
    dedupeKey?: true
    createdAt?: true
  }

  export type NotificationMaxAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    severity?: true
    title?: true
    message?: true
    linkData?: true
    read?: true
    dedupeKey?: true
    createdAt?: true
  }

  export type NotificationCountAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    severity?: true
    title?: true
    message?: true
    linkData?: true
    read?: true
    dedupeKey?: true
    createdAt?: true
    _all?: true
  }

  export type NotificationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Notification to aggregate.
     */
    where?: NotificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Notifications to fetch.
     */
    orderBy?: NotificationOrderByWithRelationInput | NotificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: NotificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Notifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Notifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Notifications
    **/
    _count?: true | NotificationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: NotificationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: NotificationMaxAggregateInputType
  }

  export type GetNotificationAggregateType<T extends NotificationAggregateArgs> = {
        [P in keyof T & keyof AggregateNotification]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNotification[P]>
      : GetScalarType<T[P], AggregateNotification[P]>
  }




  export type NotificationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: NotificationWhereInput
    orderBy?: NotificationOrderByWithAggregationInput | NotificationOrderByWithAggregationInput[]
    by: NotificationScalarFieldEnum[] | NotificationScalarFieldEnum
    having?: NotificationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: NotificationCountAggregateInputType | true
    _min?: NotificationMinAggregateInputType
    _max?: NotificationMaxAggregateInputType
  }

  export type NotificationGroupByOutputType = {
    id: string
    userId: string
    type: string
    severity: string
    title: string
    message: string
    linkData: string | null
    read: boolean
    dedupeKey: string | null
    createdAt: Date
    _count: NotificationCountAggregateOutputType | null
    _min: NotificationMinAggregateOutputType | null
    _max: NotificationMaxAggregateOutputType | null
  }

  type GetNotificationGroupByPayload<T extends NotificationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<NotificationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof NotificationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], NotificationGroupByOutputType[P]>
            : GetScalarType<T[P], NotificationGroupByOutputType[P]>
        }
      >
    >


  export type NotificationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    severity?: boolean
    title?: boolean
    message?: boolean
    linkData?: boolean
    read?: boolean
    dedupeKey?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["notification"]>

  export type NotificationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    severity?: boolean
    title?: boolean
    message?: boolean
    linkData?: boolean
    read?: boolean
    dedupeKey?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["notification"]>

  export type NotificationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    severity?: boolean
    title?: boolean
    message?: boolean
    linkData?: boolean
    read?: boolean
    dedupeKey?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["notification"]>

  export type NotificationSelectScalar = {
    id?: boolean
    userId?: boolean
    type?: boolean
    severity?: boolean
    title?: boolean
    message?: boolean
    linkData?: boolean
    read?: boolean
    dedupeKey?: boolean
    createdAt?: boolean
  }

  export type NotificationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "type" | "severity" | "title" | "message" | "linkData" | "read" | "dedupeKey" | "createdAt", ExtArgs["result"]["notification"]>
  export type NotificationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type NotificationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type NotificationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $NotificationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Notification"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      type: string
      severity: string
      title: string
      message: string
      linkData: string | null
      read: boolean
      dedupeKey: string | null
      createdAt: Date
    }, ExtArgs["result"]["notification"]>
    composites: {}
  }

  type NotificationGetPayload<S extends boolean | null | undefined | NotificationDefaultArgs> = $Result.GetResult<Prisma.$NotificationPayload, S>

  type NotificationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<NotificationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: NotificationCountAggregateInputType | true
    }

  export interface NotificationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Notification'], meta: { name: 'Notification' } }
    /**
     * Find zero or one Notification that matches the filter.
     * @param {NotificationFindUniqueArgs} args - Arguments to find a Notification
     * @example
     * // Get one Notification
     * const notification = await prisma.notification.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends NotificationFindUniqueArgs>(args: SelectSubset<T, NotificationFindUniqueArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Notification that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {NotificationFindUniqueOrThrowArgs} args - Arguments to find a Notification
     * @example
     * // Get one Notification
     * const notification = await prisma.notification.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends NotificationFindUniqueOrThrowArgs>(args: SelectSubset<T, NotificationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Notification that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationFindFirstArgs} args - Arguments to find a Notification
     * @example
     * // Get one Notification
     * const notification = await prisma.notification.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends NotificationFindFirstArgs>(args?: SelectSubset<T, NotificationFindFirstArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Notification that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationFindFirstOrThrowArgs} args - Arguments to find a Notification
     * @example
     * // Get one Notification
     * const notification = await prisma.notification.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends NotificationFindFirstOrThrowArgs>(args?: SelectSubset<T, NotificationFindFirstOrThrowArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Notifications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Notifications
     * const notifications = await prisma.notification.findMany()
     * 
     * // Get first 10 Notifications
     * const notifications = await prisma.notification.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const notificationWithIdOnly = await prisma.notification.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends NotificationFindManyArgs>(args?: SelectSubset<T, NotificationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Notification.
     * @param {NotificationCreateArgs} args - Arguments to create a Notification.
     * @example
     * // Create one Notification
     * const Notification = await prisma.notification.create({
     *   data: {
     *     // ... data to create a Notification
     *   }
     * })
     * 
     */
    create<T extends NotificationCreateArgs>(args: SelectSubset<T, NotificationCreateArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Notifications.
     * @param {NotificationCreateManyArgs} args - Arguments to create many Notifications.
     * @example
     * // Create many Notifications
     * const notification = await prisma.notification.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends NotificationCreateManyArgs>(args?: SelectSubset<T, NotificationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Notifications and returns the data saved in the database.
     * @param {NotificationCreateManyAndReturnArgs} args - Arguments to create many Notifications.
     * @example
     * // Create many Notifications
     * const notification = await prisma.notification.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Notifications and only return the `id`
     * const notificationWithIdOnly = await prisma.notification.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends NotificationCreateManyAndReturnArgs>(args?: SelectSubset<T, NotificationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Notification.
     * @param {NotificationDeleteArgs} args - Arguments to delete one Notification.
     * @example
     * // Delete one Notification
     * const Notification = await prisma.notification.delete({
     *   where: {
     *     // ... filter to delete one Notification
     *   }
     * })
     * 
     */
    delete<T extends NotificationDeleteArgs>(args: SelectSubset<T, NotificationDeleteArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Notification.
     * @param {NotificationUpdateArgs} args - Arguments to update one Notification.
     * @example
     * // Update one Notification
     * const notification = await prisma.notification.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends NotificationUpdateArgs>(args: SelectSubset<T, NotificationUpdateArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Notifications.
     * @param {NotificationDeleteManyArgs} args - Arguments to filter Notifications to delete.
     * @example
     * // Delete a few Notifications
     * const { count } = await prisma.notification.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends NotificationDeleteManyArgs>(args?: SelectSubset<T, NotificationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Notifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Notifications
     * const notification = await prisma.notification.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends NotificationUpdateManyArgs>(args: SelectSubset<T, NotificationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Notifications and returns the data updated in the database.
     * @param {NotificationUpdateManyAndReturnArgs} args - Arguments to update many Notifications.
     * @example
     * // Update many Notifications
     * const notification = await prisma.notification.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Notifications and only return the `id`
     * const notificationWithIdOnly = await prisma.notification.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends NotificationUpdateManyAndReturnArgs>(args: SelectSubset<T, NotificationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Notification.
     * @param {NotificationUpsertArgs} args - Arguments to update or create a Notification.
     * @example
     * // Update or create a Notification
     * const notification = await prisma.notification.upsert({
     *   create: {
     *     // ... data to create a Notification
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Notification we want to update
     *   }
     * })
     */
    upsert<T extends NotificationUpsertArgs>(args: SelectSubset<T, NotificationUpsertArgs<ExtArgs>>): Prisma__NotificationClient<$Result.GetResult<Prisma.$NotificationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Notifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationCountArgs} args - Arguments to filter Notifications to count.
     * @example
     * // Count the number of Notifications
     * const count = await prisma.notification.count({
     *   where: {
     *     // ... the filter for the Notifications we want to count
     *   }
     * })
    **/
    count<T extends NotificationCountArgs>(
      args?: Subset<T, NotificationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], NotificationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Notification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends NotificationAggregateArgs>(args: Subset<T, NotificationAggregateArgs>): Prisma.PrismaPromise<GetNotificationAggregateType<T>>

    /**
     * Group by Notification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {NotificationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends NotificationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: NotificationGroupByArgs['orderBy'] }
        : { orderBy?: NotificationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, NotificationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNotificationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Notification model
   */
  readonly fields: NotificationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Notification.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__NotificationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Notification model
   */
  interface NotificationFieldRefs {
    readonly id: FieldRef<"Notification", 'String'>
    readonly userId: FieldRef<"Notification", 'String'>
    readonly type: FieldRef<"Notification", 'String'>
    readonly severity: FieldRef<"Notification", 'String'>
    readonly title: FieldRef<"Notification", 'String'>
    readonly message: FieldRef<"Notification", 'String'>
    readonly linkData: FieldRef<"Notification", 'String'>
    readonly read: FieldRef<"Notification", 'Boolean'>
    readonly dedupeKey: FieldRef<"Notification", 'String'>
    readonly createdAt: FieldRef<"Notification", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Notification findUnique
   */
  export type NotificationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter, which Notification to fetch.
     */
    where: NotificationWhereUniqueInput
  }

  /**
   * Notification findUniqueOrThrow
   */
  export type NotificationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter, which Notification to fetch.
     */
    where: NotificationWhereUniqueInput
  }

  /**
   * Notification findFirst
   */
  export type NotificationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter, which Notification to fetch.
     */
    where?: NotificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Notifications to fetch.
     */
    orderBy?: NotificationOrderByWithRelationInput | NotificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Notifications.
     */
    cursor?: NotificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Notifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Notifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Notifications.
     */
    distinct?: NotificationScalarFieldEnum | NotificationScalarFieldEnum[]
  }

  /**
   * Notification findFirstOrThrow
   */
  export type NotificationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter, which Notification to fetch.
     */
    where?: NotificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Notifications to fetch.
     */
    orderBy?: NotificationOrderByWithRelationInput | NotificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Notifications.
     */
    cursor?: NotificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Notifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Notifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Notifications.
     */
    distinct?: NotificationScalarFieldEnum | NotificationScalarFieldEnum[]
  }

  /**
   * Notification findMany
   */
  export type NotificationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter, which Notifications to fetch.
     */
    where?: NotificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Notifications to fetch.
     */
    orderBy?: NotificationOrderByWithRelationInput | NotificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Notifications.
     */
    cursor?: NotificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Notifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Notifications.
     */
    skip?: number
    distinct?: NotificationScalarFieldEnum | NotificationScalarFieldEnum[]
  }

  /**
   * Notification create
   */
  export type NotificationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * The data needed to create a Notification.
     */
    data: XOR<NotificationCreateInput, NotificationUncheckedCreateInput>
  }

  /**
   * Notification createMany
   */
  export type NotificationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Notifications.
     */
    data: NotificationCreateManyInput | NotificationCreateManyInput[]
  }

  /**
   * Notification createManyAndReturn
   */
  export type NotificationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * The data used to create many Notifications.
     */
    data: NotificationCreateManyInput | NotificationCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Notification update
   */
  export type NotificationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * The data needed to update a Notification.
     */
    data: XOR<NotificationUpdateInput, NotificationUncheckedUpdateInput>
    /**
     * Choose, which Notification to update.
     */
    where: NotificationWhereUniqueInput
  }

  /**
   * Notification updateMany
   */
  export type NotificationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Notifications.
     */
    data: XOR<NotificationUpdateManyMutationInput, NotificationUncheckedUpdateManyInput>
    /**
     * Filter which Notifications to update
     */
    where?: NotificationWhereInput
    /**
     * Limit how many Notifications to update.
     */
    limit?: number
  }

  /**
   * Notification updateManyAndReturn
   */
  export type NotificationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * The data used to update Notifications.
     */
    data: XOR<NotificationUpdateManyMutationInput, NotificationUncheckedUpdateManyInput>
    /**
     * Filter which Notifications to update
     */
    where?: NotificationWhereInput
    /**
     * Limit how many Notifications to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Notification upsert
   */
  export type NotificationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * The filter to search for the Notification to update in case it exists.
     */
    where: NotificationWhereUniqueInput
    /**
     * In case the Notification found by the `where` argument doesn't exist, create a new Notification with this data.
     */
    create: XOR<NotificationCreateInput, NotificationUncheckedCreateInput>
    /**
     * In case the Notification was found with the provided `where` argument, update it with this data.
     */
    update: XOR<NotificationUpdateInput, NotificationUncheckedUpdateInput>
  }

  /**
   * Notification delete
   */
  export type NotificationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
    /**
     * Filter which Notification to delete.
     */
    where: NotificationWhereUniqueInput
  }

  /**
   * Notification deleteMany
   */
  export type NotificationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Notifications to delete
     */
    where?: NotificationWhereInput
    /**
     * Limit how many Notifications to delete.
     */
    limit?: number
  }

  /**
   * Notification without action
   */
  export type NotificationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Notification
     */
    select?: NotificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Notification
     */
    omit?: NotificationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: NotificationInclude<ExtArgs> | null
  }


  /**
   * Model KpiConfig
   */

  export type AggregateKpiConfig = {
    _count: KpiConfigCountAggregateOutputType | null
    _avg: KpiConfigAvgAggregateOutputType | null
    _sum: KpiConfigSumAggregateOutputType | null
    _min: KpiConfigMinAggregateOutputType | null
    _max: KpiConfigMaxAggregateOutputType | null
  }

  export type KpiConfigAvgAggregateOutputType = {
    defaultTarget: number | null
    sortOrder: number | null
  }

  export type KpiConfigSumAggregateOutputType = {
    defaultTarget: number | null
    sortOrder: number | null
  }

  export type KpiConfigMinAggregateOutputType = {
    id: string | null
    department: string | null
    key: string | null
    label: string | null
    category: string | null
    unit: string | null
    direction: string | null
    defaultTarget: number | null
    derivedFrom: string | null
    mandatory: boolean | null
    active: boolean | null
    sortOrder: number | null
  }

  export type KpiConfigMaxAggregateOutputType = {
    id: string | null
    department: string | null
    key: string | null
    label: string | null
    category: string | null
    unit: string | null
    direction: string | null
    defaultTarget: number | null
    derivedFrom: string | null
    mandatory: boolean | null
    active: boolean | null
    sortOrder: number | null
  }

  export type KpiConfigCountAggregateOutputType = {
    id: number
    department: number
    key: number
    label: number
    category: number
    unit: number
    direction: number
    defaultTarget: number
    derivedFrom: number
    mandatory: number
    active: number
    sortOrder: number
    _all: number
  }


  export type KpiConfigAvgAggregateInputType = {
    defaultTarget?: true
    sortOrder?: true
  }

  export type KpiConfigSumAggregateInputType = {
    defaultTarget?: true
    sortOrder?: true
  }

  export type KpiConfigMinAggregateInputType = {
    id?: true
    department?: true
    key?: true
    label?: true
    category?: true
    unit?: true
    direction?: true
    defaultTarget?: true
    derivedFrom?: true
    mandatory?: true
    active?: true
    sortOrder?: true
  }

  export type KpiConfigMaxAggregateInputType = {
    id?: true
    department?: true
    key?: true
    label?: true
    category?: true
    unit?: true
    direction?: true
    defaultTarget?: true
    derivedFrom?: true
    mandatory?: true
    active?: true
    sortOrder?: true
  }

  export type KpiConfigCountAggregateInputType = {
    id?: true
    department?: true
    key?: true
    label?: true
    category?: true
    unit?: true
    direction?: true
    defaultTarget?: true
    derivedFrom?: true
    mandatory?: true
    active?: true
    sortOrder?: true
    _all?: true
  }

  export type KpiConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KpiConfig to aggregate.
     */
    where?: KpiConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiConfigs to fetch.
     */
    orderBy?: KpiConfigOrderByWithRelationInput | KpiConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: KpiConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned KpiConfigs
    **/
    _count?: true | KpiConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: KpiConfigAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: KpiConfigSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: KpiConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: KpiConfigMaxAggregateInputType
  }

  export type GetKpiConfigAggregateType<T extends KpiConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateKpiConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateKpiConfig[P]>
      : GetScalarType<T[P], AggregateKpiConfig[P]>
  }




  export type KpiConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: KpiConfigWhereInput
    orderBy?: KpiConfigOrderByWithAggregationInput | KpiConfigOrderByWithAggregationInput[]
    by: KpiConfigScalarFieldEnum[] | KpiConfigScalarFieldEnum
    having?: KpiConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: KpiConfigCountAggregateInputType | true
    _avg?: KpiConfigAvgAggregateInputType
    _sum?: KpiConfigSumAggregateInputType
    _min?: KpiConfigMinAggregateInputType
    _max?: KpiConfigMaxAggregateInputType
  }

  export type KpiConfigGroupByOutputType = {
    id: string
    department: string
    key: string
    label: string
    category: string
    unit: string
    direction: string
    defaultTarget: number | null
    derivedFrom: string | null
    mandatory: boolean
    active: boolean
    sortOrder: number
    _count: KpiConfigCountAggregateOutputType | null
    _avg: KpiConfigAvgAggregateOutputType | null
    _sum: KpiConfigSumAggregateOutputType | null
    _min: KpiConfigMinAggregateOutputType | null
    _max: KpiConfigMaxAggregateOutputType | null
  }

  type GetKpiConfigGroupByPayload<T extends KpiConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<KpiConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof KpiConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], KpiConfigGroupByOutputType[P]>
            : GetScalarType<T[P], KpiConfigGroupByOutputType[P]>
        }
      >
    >


  export type KpiConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department?: boolean
    key?: boolean
    label?: boolean
    category?: boolean
    unit?: boolean
    direction?: boolean
    defaultTarget?: boolean
    derivedFrom?: boolean
    mandatory?: boolean
    active?: boolean
    sortOrder?: boolean
  }, ExtArgs["result"]["kpiConfig"]>

  export type KpiConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department?: boolean
    key?: boolean
    label?: boolean
    category?: boolean
    unit?: boolean
    direction?: boolean
    defaultTarget?: boolean
    derivedFrom?: boolean
    mandatory?: boolean
    active?: boolean
    sortOrder?: boolean
  }, ExtArgs["result"]["kpiConfig"]>

  export type KpiConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department?: boolean
    key?: boolean
    label?: boolean
    category?: boolean
    unit?: boolean
    direction?: boolean
    defaultTarget?: boolean
    derivedFrom?: boolean
    mandatory?: boolean
    active?: boolean
    sortOrder?: boolean
  }, ExtArgs["result"]["kpiConfig"]>

  export type KpiConfigSelectScalar = {
    id?: boolean
    department?: boolean
    key?: boolean
    label?: boolean
    category?: boolean
    unit?: boolean
    direction?: boolean
    defaultTarget?: boolean
    derivedFrom?: boolean
    mandatory?: boolean
    active?: boolean
    sortOrder?: boolean
  }

  export type KpiConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "department" | "key" | "label" | "category" | "unit" | "direction" | "defaultTarget" | "derivedFrom" | "mandatory" | "active" | "sortOrder", ExtArgs["result"]["kpiConfig"]>

  export type $KpiConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "KpiConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      department: string
      key: string
      label: string
      category: string
      unit: string
      direction: string
      defaultTarget: number | null
      derivedFrom: string | null
      mandatory: boolean
      active: boolean
      sortOrder: number
    }, ExtArgs["result"]["kpiConfig"]>
    composites: {}
  }

  type KpiConfigGetPayload<S extends boolean | null | undefined | KpiConfigDefaultArgs> = $Result.GetResult<Prisma.$KpiConfigPayload, S>

  type KpiConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<KpiConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: KpiConfigCountAggregateInputType | true
    }

  export interface KpiConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['KpiConfig'], meta: { name: 'KpiConfig' } }
    /**
     * Find zero or one KpiConfig that matches the filter.
     * @param {KpiConfigFindUniqueArgs} args - Arguments to find a KpiConfig
     * @example
     * // Get one KpiConfig
     * const kpiConfig = await prisma.kpiConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends KpiConfigFindUniqueArgs>(args: SelectSubset<T, KpiConfigFindUniqueArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one KpiConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {KpiConfigFindUniqueOrThrowArgs} args - Arguments to find a KpiConfig
     * @example
     * // Get one KpiConfig
     * const kpiConfig = await prisma.kpiConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends KpiConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, KpiConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first KpiConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigFindFirstArgs} args - Arguments to find a KpiConfig
     * @example
     * // Get one KpiConfig
     * const kpiConfig = await prisma.kpiConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends KpiConfigFindFirstArgs>(args?: SelectSubset<T, KpiConfigFindFirstArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first KpiConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigFindFirstOrThrowArgs} args - Arguments to find a KpiConfig
     * @example
     * // Get one KpiConfig
     * const kpiConfig = await prisma.kpiConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends KpiConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, KpiConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more KpiConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all KpiConfigs
     * const kpiConfigs = await prisma.kpiConfig.findMany()
     * 
     * // Get first 10 KpiConfigs
     * const kpiConfigs = await prisma.kpiConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const kpiConfigWithIdOnly = await prisma.kpiConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends KpiConfigFindManyArgs>(args?: SelectSubset<T, KpiConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a KpiConfig.
     * @param {KpiConfigCreateArgs} args - Arguments to create a KpiConfig.
     * @example
     * // Create one KpiConfig
     * const KpiConfig = await prisma.kpiConfig.create({
     *   data: {
     *     // ... data to create a KpiConfig
     *   }
     * })
     * 
     */
    create<T extends KpiConfigCreateArgs>(args: SelectSubset<T, KpiConfigCreateArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many KpiConfigs.
     * @param {KpiConfigCreateManyArgs} args - Arguments to create many KpiConfigs.
     * @example
     * // Create many KpiConfigs
     * const kpiConfig = await prisma.kpiConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends KpiConfigCreateManyArgs>(args?: SelectSubset<T, KpiConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many KpiConfigs and returns the data saved in the database.
     * @param {KpiConfigCreateManyAndReturnArgs} args - Arguments to create many KpiConfigs.
     * @example
     * // Create many KpiConfigs
     * const kpiConfig = await prisma.kpiConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many KpiConfigs and only return the `id`
     * const kpiConfigWithIdOnly = await prisma.kpiConfig.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends KpiConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, KpiConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a KpiConfig.
     * @param {KpiConfigDeleteArgs} args - Arguments to delete one KpiConfig.
     * @example
     * // Delete one KpiConfig
     * const KpiConfig = await prisma.kpiConfig.delete({
     *   where: {
     *     // ... filter to delete one KpiConfig
     *   }
     * })
     * 
     */
    delete<T extends KpiConfigDeleteArgs>(args: SelectSubset<T, KpiConfigDeleteArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one KpiConfig.
     * @param {KpiConfigUpdateArgs} args - Arguments to update one KpiConfig.
     * @example
     * // Update one KpiConfig
     * const kpiConfig = await prisma.kpiConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends KpiConfigUpdateArgs>(args: SelectSubset<T, KpiConfigUpdateArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more KpiConfigs.
     * @param {KpiConfigDeleteManyArgs} args - Arguments to filter KpiConfigs to delete.
     * @example
     * // Delete a few KpiConfigs
     * const { count } = await prisma.kpiConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends KpiConfigDeleteManyArgs>(args?: SelectSubset<T, KpiConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more KpiConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many KpiConfigs
     * const kpiConfig = await prisma.kpiConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends KpiConfigUpdateManyArgs>(args: SelectSubset<T, KpiConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more KpiConfigs and returns the data updated in the database.
     * @param {KpiConfigUpdateManyAndReturnArgs} args - Arguments to update many KpiConfigs.
     * @example
     * // Update many KpiConfigs
     * const kpiConfig = await prisma.kpiConfig.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more KpiConfigs and only return the `id`
     * const kpiConfigWithIdOnly = await prisma.kpiConfig.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends KpiConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, KpiConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one KpiConfig.
     * @param {KpiConfigUpsertArgs} args - Arguments to update or create a KpiConfig.
     * @example
     * // Update or create a KpiConfig
     * const kpiConfig = await prisma.kpiConfig.upsert({
     *   create: {
     *     // ... data to create a KpiConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the KpiConfig we want to update
     *   }
     * })
     */
    upsert<T extends KpiConfigUpsertArgs>(args: SelectSubset<T, KpiConfigUpsertArgs<ExtArgs>>): Prisma__KpiConfigClient<$Result.GetResult<Prisma.$KpiConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of KpiConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigCountArgs} args - Arguments to filter KpiConfigs to count.
     * @example
     * // Count the number of KpiConfigs
     * const count = await prisma.kpiConfig.count({
     *   where: {
     *     // ... the filter for the KpiConfigs we want to count
     *   }
     * })
    **/
    count<T extends KpiConfigCountArgs>(
      args?: Subset<T, KpiConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], KpiConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a KpiConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends KpiConfigAggregateArgs>(args: Subset<T, KpiConfigAggregateArgs>): Prisma.PrismaPromise<GetKpiConfigAggregateType<T>>

    /**
     * Group by KpiConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {KpiConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends KpiConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: KpiConfigGroupByArgs['orderBy'] }
        : { orderBy?: KpiConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, KpiConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetKpiConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the KpiConfig model
   */
  readonly fields: KpiConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for KpiConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__KpiConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the KpiConfig model
   */
  interface KpiConfigFieldRefs {
    readonly id: FieldRef<"KpiConfig", 'String'>
    readonly department: FieldRef<"KpiConfig", 'String'>
    readonly key: FieldRef<"KpiConfig", 'String'>
    readonly label: FieldRef<"KpiConfig", 'String'>
    readonly category: FieldRef<"KpiConfig", 'String'>
    readonly unit: FieldRef<"KpiConfig", 'String'>
    readonly direction: FieldRef<"KpiConfig", 'String'>
    readonly defaultTarget: FieldRef<"KpiConfig", 'Float'>
    readonly derivedFrom: FieldRef<"KpiConfig", 'String'>
    readonly mandatory: FieldRef<"KpiConfig", 'Boolean'>
    readonly active: FieldRef<"KpiConfig", 'Boolean'>
    readonly sortOrder: FieldRef<"KpiConfig", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * KpiConfig findUnique
   */
  export type KpiConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter, which KpiConfig to fetch.
     */
    where: KpiConfigWhereUniqueInput
  }

  /**
   * KpiConfig findUniqueOrThrow
   */
  export type KpiConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter, which KpiConfig to fetch.
     */
    where: KpiConfigWhereUniqueInput
  }

  /**
   * KpiConfig findFirst
   */
  export type KpiConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter, which KpiConfig to fetch.
     */
    where?: KpiConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiConfigs to fetch.
     */
    orderBy?: KpiConfigOrderByWithRelationInput | KpiConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KpiConfigs.
     */
    cursor?: KpiConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KpiConfigs.
     */
    distinct?: KpiConfigScalarFieldEnum | KpiConfigScalarFieldEnum[]
  }

  /**
   * KpiConfig findFirstOrThrow
   */
  export type KpiConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter, which KpiConfig to fetch.
     */
    where?: KpiConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiConfigs to fetch.
     */
    orderBy?: KpiConfigOrderByWithRelationInput | KpiConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for KpiConfigs.
     */
    cursor?: KpiConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of KpiConfigs.
     */
    distinct?: KpiConfigScalarFieldEnum | KpiConfigScalarFieldEnum[]
  }

  /**
   * KpiConfig findMany
   */
  export type KpiConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter, which KpiConfigs to fetch.
     */
    where?: KpiConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of KpiConfigs to fetch.
     */
    orderBy?: KpiConfigOrderByWithRelationInput | KpiConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing KpiConfigs.
     */
    cursor?: KpiConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` KpiConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` KpiConfigs.
     */
    skip?: number
    distinct?: KpiConfigScalarFieldEnum | KpiConfigScalarFieldEnum[]
  }

  /**
   * KpiConfig create
   */
  export type KpiConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a KpiConfig.
     */
    data: XOR<KpiConfigCreateInput, KpiConfigUncheckedCreateInput>
  }

  /**
   * KpiConfig createMany
   */
  export type KpiConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many KpiConfigs.
     */
    data: KpiConfigCreateManyInput | KpiConfigCreateManyInput[]
  }

  /**
   * KpiConfig createManyAndReturn
   */
  export type KpiConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * The data used to create many KpiConfigs.
     */
    data: KpiConfigCreateManyInput | KpiConfigCreateManyInput[]
  }

  /**
   * KpiConfig update
   */
  export type KpiConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a KpiConfig.
     */
    data: XOR<KpiConfigUpdateInput, KpiConfigUncheckedUpdateInput>
    /**
     * Choose, which KpiConfig to update.
     */
    where: KpiConfigWhereUniqueInput
  }

  /**
   * KpiConfig updateMany
   */
  export type KpiConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update KpiConfigs.
     */
    data: XOR<KpiConfigUpdateManyMutationInput, KpiConfigUncheckedUpdateManyInput>
    /**
     * Filter which KpiConfigs to update
     */
    where?: KpiConfigWhereInput
    /**
     * Limit how many KpiConfigs to update.
     */
    limit?: number
  }

  /**
   * KpiConfig updateManyAndReturn
   */
  export type KpiConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * The data used to update KpiConfigs.
     */
    data: XOR<KpiConfigUpdateManyMutationInput, KpiConfigUncheckedUpdateManyInput>
    /**
     * Filter which KpiConfigs to update
     */
    where?: KpiConfigWhereInput
    /**
     * Limit how many KpiConfigs to update.
     */
    limit?: number
  }

  /**
   * KpiConfig upsert
   */
  export type KpiConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the KpiConfig to update in case it exists.
     */
    where: KpiConfigWhereUniqueInput
    /**
     * In case the KpiConfig found by the `where` argument doesn't exist, create a new KpiConfig with this data.
     */
    create: XOR<KpiConfigCreateInput, KpiConfigUncheckedCreateInput>
    /**
     * In case the KpiConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<KpiConfigUpdateInput, KpiConfigUncheckedUpdateInput>
  }

  /**
   * KpiConfig delete
   */
  export type KpiConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
    /**
     * Filter which KpiConfig to delete.
     */
    where: KpiConfigWhereUniqueInput
  }

  /**
   * KpiConfig deleteMany
   */
  export type KpiConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which KpiConfigs to delete
     */
    where?: KpiConfigWhereInput
    /**
     * Limit how many KpiConfigs to delete.
     */
    limit?: number
  }

  /**
   * KpiConfig without action
   */
  export type KpiConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the KpiConfig
     */
    select?: KpiConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the KpiConfig
     */
    omit?: KpiConfigOmit<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: string | null
    userId: string | null
    actorName: string | null
    action: string | null
    entity: string | null
    entityId: string | null
    details: string | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    actorName: string | null
    action: string | null
    entity: string | null
    entityId: string | null
    details: string | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    userId: number
    actorName: number
    action: number
    entity: number
    entityId: number
    details: number
    createdAt: number
    _all: number
  }


  export type AuditLogMinAggregateInputType = {
    id?: true
    userId?: true
    actorName?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    userId?: true
    actorName?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    userId?: true
    actorName?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: string
    userId: string | null
    actorName: string | null
    action: string
    entity: string
    entityId: string | null
    details: string | null
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actorName?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actorName?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    actorName?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    id?: boolean
    userId?: boolean
    actorName?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    createdAt?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "actorName" | "action" | "entity" | "entityId" | "details" | "createdAt", ExtArgs["result"]["auditLog"]>
  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }
  export type AuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }
  export type AuditLogIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      actorName: string | null
      action: string
      entity: string
      entityId: string | null
      details: string | null
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs and returns the data updated in the database.
     * @param {AuditLogUpdateManyAndReturnArgs} args - Arguments to update many AuditLogs.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends AuditLog$userArgs<ExtArgs> = {}>(args?: Subset<T, AuditLog$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'String'>
    readonly userId: FieldRef<"AuditLog", 'String'>
    readonly actorName: FieldRef<"AuditLog", 'String'>
    readonly action: FieldRef<"AuditLog", 'String'>
    readonly entity: FieldRef<"AuditLog", 'String'>
    readonly entityId: FieldRef<"AuditLog", 'String'>
    readonly details: FieldRef<"AuditLog", 'String'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog updateManyAndReturn
   */
  export type AuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog.user
   */
  export type AuditLog$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model SystemFlag
   */

  export type AggregateSystemFlag = {
    _count: SystemFlagCountAggregateOutputType | null
    _min: SystemFlagMinAggregateOutputType | null
    _max: SystemFlagMaxAggregateOutputType | null
  }

  export type SystemFlagMinAggregateOutputType = {
    key: string | null
    value: string | null
    updatedAt: Date | null
  }

  export type SystemFlagMaxAggregateOutputType = {
    key: string | null
    value: string | null
    updatedAt: Date | null
  }

  export type SystemFlagCountAggregateOutputType = {
    key: number
    value: number
    updatedAt: number
    _all: number
  }


  export type SystemFlagMinAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
  }

  export type SystemFlagMaxAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
  }

  export type SystemFlagCountAggregateInputType = {
    key?: true
    value?: true
    updatedAt?: true
    _all?: true
  }

  export type SystemFlagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemFlag to aggregate.
     */
    where?: SystemFlagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemFlags to fetch.
     */
    orderBy?: SystemFlagOrderByWithRelationInput | SystemFlagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SystemFlagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemFlags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemFlags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SystemFlags
    **/
    _count?: true | SystemFlagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SystemFlagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SystemFlagMaxAggregateInputType
  }

  export type GetSystemFlagAggregateType<T extends SystemFlagAggregateArgs> = {
        [P in keyof T & keyof AggregateSystemFlag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSystemFlag[P]>
      : GetScalarType<T[P], AggregateSystemFlag[P]>
  }




  export type SystemFlagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SystemFlagWhereInput
    orderBy?: SystemFlagOrderByWithAggregationInput | SystemFlagOrderByWithAggregationInput[]
    by: SystemFlagScalarFieldEnum[] | SystemFlagScalarFieldEnum
    having?: SystemFlagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SystemFlagCountAggregateInputType | true
    _min?: SystemFlagMinAggregateInputType
    _max?: SystemFlagMaxAggregateInputType
  }

  export type SystemFlagGroupByOutputType = {
    key: string
    value: string
    updatedAt: Date
    _count: SystemFlagCountAggregateOutputType | null
    _min: SystemFlagMinAggregateOutputType | null
    _max: SystemFlagMaxAggregateOutputType | null
  }

  type GetSystemFlagGroupByPayload<T extends SystemFlagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SystemFlagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SystemFlagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SystemFlagGroupByOutputType[P]>
            : GetScalarType<T[P], SystemFlagGroupByOutputType[P]>
        }
      >
    >


  export type SystemFlagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemFlag"]>

  export type SystemFlagSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemFlag"]>

  export type SystemFlagSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["systemFlag"]>

  export type SystemFlagSelectScalar = {
    key?: boolean
    value?: boolean
    updatedAt?: boolean
  }

  export type SystemFlagOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value" | "updatedAt", ExtArgs["result"]["systemFlag"]>

  export type $SystemFlagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SystemFlag"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      updatedAt: Date
    }, ExtArgs["result"]["systemFlag"]>
    composites: {}
  }

  type SystemFlagGetPayload<S extends boolean | null | undefined | SystemFlagDefaultArgs> = $Result.GetResult<Prisma.$SystemFlagPayload, S>

  type SystemFlagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SystemFlagFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SystemFlagCountAggregateInputType | true
    }

  export interface SystemFlagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SystemFlag'], meta: { name: 'SystemFlag' } }
    /**
     * Find zero or one SystemFlag that matches the filter.
     * @param {SystemFlagFindUniqueArgs} args - Arguments to find a SystemFlag
     * @example
     * // Get one SystemFlag
     * const systemFlag = await prisma.systemFlag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SystemFlagFindUniqueArgs>(args: SelectSubset<T, SystemFlagFindUniqueArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SystemFlag that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SystemFlagFindUniqueOrThrowArgs} args - Arguments to find a SystemFlag
     * @example
     * // Get one SystemFlag
     * const systemFlag = await prisma.systemFlag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SystemFlagFindUniqueOrThrowArgs>(args: SelectSubset<T, SystemFlagFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemFlag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagFindFirstArgs} args - Arguments to find a SystemFlag
     * @example
     * // Get one SystemFlag
     * const systemFlag = await prisma.systemFlag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SystemFlagFindFirstArgs>(args?: SelectSubset<T, SystemFlagFindFirstArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SystemFlag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagFindFirstOrThrowArgs} args - Arguments to find a SystemFlag
     * @example
     * // Get one SystemFlag
     * const systemFlag = await prisma.systemFlag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SystemFlagFindFirstOrThrowArgs>(args?: SelectSubset<T, SystemFlagFindFirstOrThrowArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SystemFlags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SystemFlags
     * const systemFlags = await prisma.systemFlag.findMany()
     * 
     * // Get first 10 SystemFlags
     * const systemFlags = await prisma.systemFlag.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const systemFlagWithKeyOnly = await prisma.systemFlag.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends SystemFlagFindManyArgs>(args?: SelectSubset<T, SystemFlagFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SystemFlag.
     * @param {SystemFlagCreateArgs} args - Arguments to create a SystemFlag.
     * @example
     * // Create one SystemFlag
     * const SystemFlag = await prisma.systemFlag.create({
     *   data: {
     *     // ... data to create a SystemFlag
     *   }
     * })
     * 
     */
    create<T extends SystemFlagCreateArgs>(args: SelectSubset<T, SystemFlagCreateArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SystemFlags.
     * @param {SystemFlagCreateManyArgs} args - Arguments to create many SystemFlags.
     * @example
     * // Create many SystemFlags
     * const systemFlag = await prisma.systemFlag.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SystemFlagCreateManyArgs>(args?: SelectSubset<T, SystemFlagCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SystemFlags and returns the data saved in the database.
     * @param {SystemFlagCreateManyAndReturnArgs} args - Arguments to create many SystemFlags.
     * @example
     * // Create many SystemFlags
     * const systemFlag = await prisma.systemFlag.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SystemFlags and only return the `key`
     * const systemFlagWithKeyOnly = await prisma.systemFlag.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SystemFlagCreateManyAndReturnArgs>(args?: SelectSubset<T, SystemFlagCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SystemFlag.
     * @param {SystemFlagDeleteArgs} args - Arguments to delete one SystemFlag.
     * @example
     * // Delete one SystemFlag
     * const SystemFlag = await prisma.systemFlag.delete({
     *   where: {
     *     // ... filter to delete one SystemFlag
     *   }
     * })
     * 
     */
    delete<T extends SystemFlagDeleteArgs>(args: SelectSubset<T, SystemFlagDeleteArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SystemFlag.
     * @param {SystemFlagUpdateArgs} args - Arguments to update one SystemFlag.
     * @example
     * // Update one SystemFlag
     * const systemFlag = await prisma.systemFlag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SystemFlagUpdateArgs>(args: SelectSubset<T, SystemFlagUpdateArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SystemFlags.
     * @param {SystemFlagDeleteManyArgs} args - Arguments to filter SystemFlags to delete.
     * @example
     * // Delete a few SystemFlags
     * const { count } = await prisma.systemFlag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SystemFlagDeleteManyArgs>(args?: SelectSubset<T, SystemFlagDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemFlags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SystemFlags
     * const systemFlag = await prisma.systemFlag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SystemFlagUpdateManyArgs>(args: SelectSubset<T, SystemFlagUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SystemFlags and returns the data updated in the database.
     * @param {SystemFlagUpdateManyAndReturnArgs} args - Arguments to update many SystemFlags.
     * @example
     * // Update many SystemFlags
     * const systemFlag = await prisma.systemFlag.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SystemFlags and only return the `key`
     * const systemFlagWithKeyOnly = await prisma.systemFlag.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SystemFlagUpdateManyAndReturnArgs>(args: SelectSubset<T, SystemFlagUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SystemFlag.
     * @param {SystemFlagUpsertArgs} args - Arguments to update or create a SystemFlag.
     * @example
     * // Update or create a SystemFlag
     * const systemFlag = await prisma.systemFlag.upsert({
     *   create: {
     *     // ... data to create a SystemFlag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SystemFlag we want to update
     *   }
     * })
     */
    upsert<T extends SystemFlagUpsertArgs>(args: SelectSubset<T, SystemFlagUpsertArgs<ExtArgs>>): Prisma__SystemFlagClient<$Result.GetResult<Prisma.$SystemFlagPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SystemFlags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagCountArgs} args - Arguments to filter SystemFlags to count.
     * @example
     * // Count the number of SystemFlags
     * const count = await prisma.systemFlag.count({
     *   where: {
     *     // ... the filter for the SystemFlags we want to count
     *   }
     * })
    **/
    count<T extends SystemFlagCountArgs>(
      args?: Subset<T, SystemFlagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SystemFlagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SystemFlag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SystemFlagAggregateArgs>(args: Subset<T, SystemFlagAggregateArgs>): Prisma.PrismaPromise<GetSystemFlagAggregateType<T>>

    /**
     * Group by SystemFlag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SystemFlagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SystemFlagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SystemFlagGroupByArgs['orderBy'] }
        : { orderBy?: SystemFlagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SystemFlagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSystemFlagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SystemFlag model
   */
  readonly fields: SystemFlagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SystemFlag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SystemFlagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SystemFlag model
   */
  interface SystemFlagFieldRefs {
    readonly key: FieldRef<"SystemFlag", 'String'>
    readonly value: FieldRef<"SystemFlag", 'String'>
    readonly updatedAt: FieldRef<"SystemFlag", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SystemFlag findUnique
   */
  export type SystemFlagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter, which SystemFlag to fetch.
     */
    where: SystemFlagWhereUniqueInput
  }

  /**
   * SystemFlag findUniqueOrThrow
   */
  export type SystemFlagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter, which SystemFlag to fetch.
     */
    where: SystemFlagWhereUniqueInput
  }

  /**
   * SystemFlag findFirst
   */
  export type SystemFlagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter, which SystemFlag to fetch.
     */
    where?: SystemFlagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemFlags to fetch.
     */
    orderBy?: SystemFlagOrderByWithRelationInput | SystemFlagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemFlags.
     */
    cursor?: SystemFlagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemFlags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemFlags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemFlags.
     */
    distinct?: SystemFlagScalarFieldEnum | SystemFlagScalarFieldEnum[]
  }

  /**
   * SystemFlag findFirstOrThrow
   */
  export type SystemFlagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter, which SystemFlag to fetch.
     */
    where?: SystemFlagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemFlags to fetch.
     */
    orderBy?: SystemFlagOrderByWithRelationInput | SystemFlagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SystemFlags.
     */
    cursor?: SystemFlagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemFlags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemFlags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SystemFlags.
     */
    distinct?: SystemFlagScalarFieldEnum | SystemFlagScalarFieldEnum[]
  }

  /**
   * SystemFlag findMany
   */
  export type SystemFlagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter, which SystemFlags to fetch.
     */
    where?: SystemFlagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SystemFlags to fetch.
     */
    orderBy?: SystemFlagOrderByWithRelationInput | SystemFlagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SystemFlags.
     */
    cursor?: SystemFlagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SystemFlags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SystemFlags.
     */
    skip?: number
    distinct?: SystemFlagScalarFieldEnum | SystemFlagScalarFieldEnum[]
  }

  /**
   * SystemFlag create
   */
  export type SystemFlagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * The data needed to create a SystemFlag.
     */
    data: XOR<SystemFlagCreateInput, SystemFlagUncheckedCreateInput>
  }

  /**
   * SystemFlag createMany
   */
  export type SystemFlagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SystemFlags.
     */
    data: SystemFlagCreateManyInput | SystemFlagCreateManyInput[]
  }

  /**
   * SystemFlag createManyAndReturn
   */
  export type SystemFlagCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * The data used to create many SystemFlags.
     */
    data: SystemFlagCreateManyInput | SystemFlagCreateManyInput[]
  }

  /**
   * SystemFlag update
   */
  export type SystemFlagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * The data needed to update a SystemFlag.
     */
    data: XOR<SystemFlagUpdateInput, SystemFlagUncheckedUpdateInput>
    /**
     * Choose, which SystemFlag to update.
     */
    where: SystemFlagWhereUniqueInput
  }

  /**
   * SystemFlag updateMany
   */
  export type SystemFlagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SystemFlags.
     */
    data: XOR<SystemFlagUpdateManyMutationInput, SystemFlagUncheckedUpdateManyInput>
    /**
     * Filter which SystemFlags to update
     */
    where?: SystemFlagWhereInput
    /**
     * Limit how many SystemFlags to update.
     */
    limit?: number
  }

  /**
   * SystemFlag updateManyAndReturn
   */
  export type SystemFlagUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * The data used to update SystemFlags.
     */
    data: XOR<SystemFlagUpdateManyMutationInput, SystemFlagUncheckedUpdateManyInput>
    /**
     * Filter which SystemFlags to update
     */
    where?: SystemFlagWhereInput
    /**
     * Limit how many SystemFlags to update.
     */
    limit?: number
  }

  /**
   * SystemFlag upsert
   */
  export type SystemFlagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * The filter to search for the SystemFlag to update in case it exists.
     */
    where: SystemFlagWhereUniqueInput
    /**
     * In case the SystemFlag found by the `where` argument doesn't exist, create a new SystemFlag with this data.
     */
    create: XOR<SystemFlagCreateInput, SystemFlagUncheckedCreateInput>
    /**
     * In case the SystemFlag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SystemFlagUpdateInput, SystemFlagUncheckedUpdateInput>
  }

  /**
   * SystemFlag delete
   */
  export type SystemFlagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
    /**
     * Filter which SystemFlag to delete.
     */
    where: SystemFlagWhereUniqueInput
  }

  /**
   * SystemFlag deleteMany
   */
  export type SystemFlagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SystemFlags to delete
     */
    where?: SystemFlagWhereInput
    /**
     * Limit how many SystemFlags to delete.
     */
    limit?: number
  }

  /**
   * SystemFlag without action
   */
  export type SystemFlagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SystemFlag
     */
    select?: SystemFlagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SystemFlag
     */
    omit?: SystemFlagOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    fullName: 'fullName',
    role: 'role',
    department: 'department',
    team: 'team',
    employeeId: 'employeeId',
    phone: 'phone',
    status: 'status',
    approvedAt: 'approvedAt',
    approvedById: 'approvedById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ReportScalarFieldEnum: {
    id: 'id',
    ref: 'ref',
    type: 'type',
    reportDate: 'reportDate',
    userId: 'userId',
    department: 'department',
    shiftTime: 'shiftTime',
    clockIn: 'clockIn',
    clockOut: 'clockOut',
    attendanceStatus: 'attendanceStatus',
    latenessMins: 'latenessMins',
    kpiMetrics: 'kpiMetrics',
    callLogs: 'callLogs',
    challenges: 'challenges',
    escalations: 'escalations',
    additionalActivities: 'additionalActivities',
    emailContext: 'emailContext',
    workEntries: 'workEntries',
    metricsSummary: 'metricsSummary',
    payload: 'payload',
    teamName: 'teamName',
    campusLocation: 'campusLocation',
    agentsManaged: 'agentsManaged',
    attendanceSummary: 'attendanceSummary',
    teamKpiAverages: 'teamKpiAverages',
    coachingEntries: 'coachingEntries',
    qaObservations: 'qaObservations',
    escalatedIssues: 'escalatedIssues',
    highlights: 'highlights',
    lowlights: 'lowlights',
    actionPlan: 'actionPlan',
    managerReview: 'managerReview',
    status: 'status',
    supervisorFeedback: 'supervisorFeedback',
    reviewedById: 'reviewedById',
    reviewedAt: 'reviewedAt',
    sourceType: 'sourceType',
    sourceFileId: 'sourceFileId',
    verificationStatus: 'verificationStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ReportScalarFieldEnum = (typeof ReportScalarFieldEnum)[keyof typeof ReportScalarFieldEnum]


  export const ReportTemplateScalarFieldEnum: {
    id: 'id',
    key: 'key',
    name: 'name',
    description: 'description',
    definition: 'definition',
    updatedById: 'updatedById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ReportTemplateScalarFieldEnum = (typeof ReportTemplateScalarFieldEnum)[keyof typeof ReportTemplateScalarFieldEnum]


  export const TaskScalarFieldEnum: {
    id: 'id',
    title: 'title',
    description: 'description',
    department: 'department',
    assigneeId: 'assigneeId',
    createdById: 'createdById',
    category: 'category',
    projectRef: 'projectRef',
    priority: 'priority',
    status: 'status',
    requiredOutcome: 'requiredOutcome',
    target: 'target',
    kpiKey: 'kpiKey',
    dateAssigned: 'dateAssigned',
    deadline: 'deadline',
    estimatedHours: 'estimatedHours',
    actualHours: 'actualHours',
    blocker: 'blocker',
    nextSteps: 'nextSteps',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TaskScalarFieldEnum = (typeof TaskScalarFieldEnum)[keyof typeof TaskScalarFieldEnum]


  export const UploadedFileScalarFieldEnum: {
    id: 'id',
    originalName: 'originalName',
    storedName: 'storedName',
    mimeType: 'mimeType',
    sizeBytes: 'sizeBytes',
    fileHash: 'fileHash',
    extractStatus: 'extractStatus',
    extractError: 'extractError',
    extractedData: 'extractedData',
    rawText: 'rawText',
    reportDate: 'reportDate',
    department: 'department',
    reportId: 'reportId',
    userId: 'userId',
    confirmedAt: 'confirmedAt',
    createdAt: 'createdAt'
  };

  export type UploadedFileScalarFieldEnum = (typeof UploadedFileScalarFieldEnum)[keyof typeof UploadedFileScalarFieldEnum]


  export const NotificationScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    type: 'type',
    severity: 'severity',
    title: 'title',
    message: 'message',
    linkData: 'linkData',
    read: 'read',
    dedupeKey: 'dedupeKey',
    createdAt: 'createdAt'
  };

  export type NotificationScalarFieldEnum = (typeof NotificationScalarFieldEnum)[keyof typeof NotificationScalarFieldEnum]


  export const KpiConfigScalarFieldEnum: {
    id: 'id',
    department: 'department',
    key: 'key',
    label: 'label',
    category: 'category',
    unit: 'unit',
    direction: 'direction',
    defaultTarget: 'defaultTarget',
    derivedFrom: 'derivedFrom',
    mandatory: 'mandatory',
    active: 'active',
    sortOrder: 'sortOrder'
  };

  export type KpiConfigScalarFieldEnum = (typeof KpiConfigScalarFieldEnum)[keyof typeof KpiConfigScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    actorName: 'actorName',
    action: 'action',
    entity: 'entity',
    entityId: 'entityId',
    details: 'details',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const SystemFlagScalarFieldEnum: {
    key: 'key',
    value: 'value',
    updatedAt: 'updatedAt'
  };

  export type SystemFlagScalarFieldEnum = (typeof SystemFlagScalarFieldEnum)[keyof typeof SystemFlagScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    fullName?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    department?: StringFilter<"User"> | string
    team?: StringNullableFilter<"User"> | string | null
    employeeId?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    status?: StringFilter<"User"> | string
    approvedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    approvedById?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    reports?: ReportListRelationFilter
    reviewedReports?: ReportListRelationFilter
    assignedTasks?: TaskListRelationFilter
    createdTasks?: TaskListRelationFilter
    notifications?: NotificationListRelationFilter
    auditLogs?: AuditLogListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
    updatedTemplates?: ReportTemplateListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    department?: SortOrder
    team?: SortOrderInput | SortOrder
    employeeId?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    status?: SortOrder
    approvedAt?: SortOrderInput | SortOrder
    approvedById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    reports?: ReportOrderByRelationAggregateInput
    reviewedReports?: ReportOrderByRelationAggregateInput
    assignedTasks?: TaskOrderByRelationAggregateInput
    createdTasks?: TaskOrderByRelationAggregateInput
    notifications?: NotificationOrderByRelationAggregateInput
    auditLogs?: AuditLogOrderByRelationAggregateInput
    uploadedFiles?: UploadedFileOrderByRelationAggregateInput
    updatedTemplates?: ReportTemplateOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    passwordHash?: StringFilter<"User"> | string
    fullName?: StringFilter<"User"> | string
    role?: StringFilter<"User"> | string
    department?: StringFilter<"User"> | string
    team?: StringNullableFilter<"User"> | string | null
    employeeId?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    status?: StringFilter<"User"> | string
    approvedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    approvedById?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    reports?: ReportListRelationFilter
    reviewedReports?: ReportListRelationFilter
    assignedTasks?: TaskListRelationFilter
    createdTasks?: TaskListRelationFilter
    notifications?: NotificationListRelationFilter
    auditLogs?: AuditLogListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
    updatedTemplates?: ReportTemplateListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    department?: SortOrder
    team?: SortOrderInput | SortOrder
    employeeId?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    status?: SortOrder
    approvedAt?: SortOrderInput | SortOrder
    approvedById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    fullName?: StringWithAggregatesFilter<"User"> | string
    role?: StringWithAggregatesFilter<"User"> | string
    department?: StringWithAggregatesFilter<"User"> | string
    team?: StringNullableWithAggregatesFilter<"User"> | string | null
    employeeId?: StringNullableWithAggregatesFilter<"User"> | string | null
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    status?: StringWithAggregatesFilter<"User"> | string
    approvedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    approvedById?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type ReportWhereInput = {
    AND?: ReportWhereInput | ReportWhereInput[]
    OR?: ReportWhereInput[]
    NOT?: ReportWhereInput | ReportWhereInput[]
    id?: StringFilter<"Report"> | string
    ref?: StringFilter<"Report"> | string
    type?: StringFilter<"Report"> | string
    reportDate?: DateTimeFilter<"Report"> | Date | string
    userId?: StringFilter<"Report"> | string
    department?: StringFilter<"Report"> | string
    shiftTime?: StringNullableFilter<"Report"> | string | null
    clockIn?: StringNullableFilter<"Report"> | string | null
    clockOut?: StringNullableFilter<"Report"> | string | null
    attendanceStatus?: StringNullableFilter<"Report"> | string | null
    latenessMins?: IntNullableFilter<"Report"> | number | null
    kpiMetrics?: StringNullableFilter<"Report"> | string | null
    callLogs?: StringNullableFilter<"Report"> | string | null
    challenges?: StringNullableFilter<"Report"> | string | null
    escalations?: StringNullableFilter<"Report"> | string | null
    additionalActivities?: StringNullableFilter<"Report"> | string | null
    emailContext?: StringNullableFilter<"Report"> | string | null
    workEntries?: StringNullableFilter<"Report"> | string | null
    metricsSummary?: StringNullableFilter<"Report"> | string | null
    payload?: StringNullableFilter<"Report"> | string | null
    teamName?: StringNullableFilter<"Report"> | string | null
    campusLocation?: StringNullableFilter<"Report"> | string | null
    agentsManaged?: IntNullableFilter<"Report"> | number | null
    attendanceSummary?: StringNullableFilter<"Report"> | string | null
    teamKpiAverages?: StringNullableFilter<"Report"> | string | null
    coachingEntries?: StringNullableFilter<"Report"> | string | null
    qaObservations?: StringNullableFilter<"Report"> | string | null
    escalatedIssues?: StringNullableFilter<"Report"> | string | null
    highlights?: StringNullableFilter<"Report"> | string | null
    lowlights?: StringNullableFilter<"Report"> | string | null
    actionPlan?: StringNullableFilter<"Report"> | string | null
    managerReview?: StringNullableFilter<"Report"> | string | null
    status?: StringFilter<"Report"> | string
    supervisorFeedback?: StringNullableFilter<"Report"> | string | null
    reviewedById?: StringNullableFilter<"Report"> | string | null
    reviewedAt?: DateTimeNullableFilter<"Report"> | Date | string | null
    sourceType?: StringFilter<"Report"> | string
    sourceFileId?: StringNullableFilter<"Report"> | string | null
    verificationStatus?: StringFilter<"Report"> | string
    createdAt?: DateTimeFilter<"Report"> | Date | string
    updatedAt?: DateTimeFilter<"Report"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    reviewer?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type ReportOrderByWithRelationInput = {
    id?: SortOrder
    ref?: SortOrder
    type?: SortOrder
    reportDate?: SortOrder
    userId?: SortOrder
    department?: SortOrder
    shiftTime?: SortOrderInput | SortOrder
    clockIn?: SortOrderInput | SortOrder
    clockOut?: SortOrderInput | SortOrder
    attendanceStatus?: SortOrderInput | SortOrder
    latenessMins?: SortOrderInput | SortOrder
    kpiMetrics?: SortOrderInput | SortOrder
    callLogs?: SortOrderInput | SortOrder
    challenges?: SortOrderInput | SortOrder
    escalations?: SortOrderInput | SortOrder
    additionalActivities?: SortOrderInput | SortOrder
    emailContext?: SortOrderInput | SortOrder
    workEntries?: SortOrderInput | SortOrder
    metricsSummary?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    teamName?: SortOrderInput | SortOrder
    campusLocation?: SortOrderInput | SortOrder
    agentsManaged?: SortOrderInput | SortOrder
    attendanceSummary?: SortOrderInput | SortOrder
    teamKpiAverages?: SortOrderInput | SortOrder
    coachingEntries?: SortOrderInput | SortOrder
    qaObservations?: SortOrderInput | SortOrder
    escalatedIssues?: SortOrderInput | SortOrder
    highlights?: SortOrderInput | SortOrder
    lowlights?: SortOrderInput | SortOrder
    actionPlan?: SortOrderInput | SortOrder
    managerReview?: SortOrderInput | SortOrder
    status?: SortOrder
    supervisorFeedback?: SortOrderInput | SortOrder
    reviewedById?: SortOrderInput | SortOrder
    reviewedAt?: SortOrderInput | SortOrder
    sourceType?: SortOrder
    sourceFileId?: SortOrderInput | SortOrder
    verificationStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    reviewer?: UserOrderByWithRelationInput
  }

  export type ReportWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    ref?: string
    AND?: ReportWhereInput | ReportWhereInput[]
    OR?: ReportWhereInput[]
    NOT?: ReportWhereInput | ReportWhereInput[]
    type?: StringFilter<"Report"> | string
    reportDate?: DateTimeFilter<"Report"> | Date | string
    userId?: StringFilter<"Report"> | string
    department?: StringFilter<"Report"> | string
    shiftTime?: StringNullableFilter<"Report"> | string | null
    clockIn?: StringNullableFilter<"Report"> | string | null
    clockOut?: StringNullableFilter<"Report"> | string | null
    attendanceStatus?: StringNullableFilter<"Report"> | string | null
    latenessMins?: IntNullableFilter<"Report"> | number | null
    kpiMetrics?: StringNullableFilter<"Report"> | string | null
    callLogs?: StringNullableFilter<"Report"> | string | null
    challenges?: StringNullableFilter<"Report"> | string | null
    escalations?: StringNullableFilter<"Report"> | string | null
    additionalActivities?: StringNullableFilter<"Report"> | string | null
    emailContext?: StringNullableFilter<"Report"> | string | null
    workEntries?: StringNullableFilter<"Report"> | string | null
    metricsSummary?: StringNullableFilter<"Report"> | string | null
    payload?: StringNullableFilter<"Report"> | string | null
    teamName?: StringNullableFilter<"Report"> | string | null
    campusLocation?: StringNullableFilter<"Report"> | string | null
    agentsManaged?: IntNullableFilter<"Report"> | number | null
    attendanceSummary?: StringNullableFilter<"Report"> | string | null
    teamKpiAverages?: StringNullableFilter<"Report"> | string | null
    coachingEntries?: StringNullableFilter<"Report"> | string | null
    qaObservations?: StringNullableFilter<"Report"> | string | null
    escalatedIssues?: StringNullableFilter<"Report"> | string | null
    highlights?: StringNullableFilter<"Report"> | string | null
    lowlights?: StringNullableFilter<"Report"> | string | null
    actionPlan?: StringNullableFilter<"Report"> | string | null
    managerReview?: StringNullableFilter<"Report"> | string | null
    status?: StringFilter<"Report"> | string
    supervisorFeedback?: StringNullableFilter<"Report"> | string | null
    reviewedById?: StringNullableFilter<"Report"> | string | null
    reviewedAt?: DateTimeNullableFilter<"Report"> | Date | string | null
    sourceType?: StringFilter<"Report"> | string
    sourceFileId?: StringNullableFilter<"Report"> | string | null
    verificationStatus?: StringFilter<"Report"> | string
    createdAt?: DateTimeFilter<"Report"> | Date | string
    updatedAt?: DateTimeFilter<"Report"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    reviewer?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "ref">

  export type ReportOrderByWithAggregationInput = {
    id?: SortOrder
    ref?: SortOrder
    type?: SortOrder
    reportDate?: SortOrder
    userId?: SortOrder
    department?: SortOrder
    shiftTime?: SortOrderInput | SortOrder
    clockIn?: SortOrderInput | SortOrder
    clockOut?: SortOrderInput | SortOrder
    attendanceStatus?: SortOrderInput | SortOrder
    latenessMins?: SortOrderInput | SortOrder
    kpiMetrics?: SortOrderInput | SortOrder
    callLogs?: SortOrderInput | SortOrder
    challenges?: SortOrderInput | SortOrder
    escalations?: SortOrderInput | SortOrder
    additionalActivities?: SortOrderInput | SortOrder
    emailContext?: SortOrderInput | SortOrder
    workEntries?: SortOrderInput | SortOrder
    metricsSummary?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    teamName?: SortOrderInput | SortOrder
    campusLocation?: SortOrderInput | SortOrder
    agentsManaged?: SortOrderInput | SortOrder
    attendanceSummary?: SortOrderInput | SortOrder
    teamKpiAverages?: SortOrderInput | SortOrder
    coachingEntries?: SortOrderInput | SortOrder
    qaObservations?: SortOrderInput | SortOrder
    escalatedIssues?: SortOrderInput | SortOrder
    highlights?: SortOrderInput | SortOrder
    lowlights?: SortOrderInput | SortOrder
    actionPlan?: SortOrderInput | SortOrder
    managerReview?: SortOrderInput | SortOrder
    status?: SortOrder
    supervisorFeedback?: SortOrderInput | SortOrder
    reviewedById?: SortOrderInput | SortOrder
    reviewedAt?: SortOrderInput | SortOrder
    sourceType?: SortOrder
    sourceFileId?: SortOrderInput | SortOrder
    verificationStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ReportCountOrderByAggregateInput
    _avg?: ReportAvgOrderByAggregateInput
    _max?: ReportMaxOrderByAggregateInput
    _min?: ReportMinOrderByAggregateInput
    _sum?: ReportSumOrderByAggregateInput
  }

  export type ReportScalarWhereWithAggregatesInput = {
    AND?: ReportScalarWhereWithAggregatesInput | ReportScalarWhereWithAggregatesInput[]
    OR?: ReportScalarWhereWithAggregatesInput[]
    NOT?: ReportScalarWhereWithAggregatesInput | ReportScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Report"> | string
    ref?: StringWithAggregatesFilter<"Report"> | string
    type?: StringWithAggregatesFilter<"Report"> | string
    reportDate?: DateTimeWithAggregatesFilter<"Report"> | Date | string
    userId?: StringWithAggregatesFilter<"Report"> | string
    department?: StringWithAggregatesFilter<"Report"> | string
    shiftTime?: StringNullableWithAggregatesFilter<"Report"> | string | null
    clockIn?: StringNullableWithAggregatesFilter<"Report"> | string | null
    clockOut?: StringNullableWithAggregatesFilter<"Report"> | string | null
    attendanceStatus?: StringNullableWithAggregatesFilter<"Report"> | string | null
    latenessMins?: IntNullableWithAggregatesFilter<"Report"> | number | null
    kpiMetrics?: StringNullableWithAggregatesFilter<"Report"> | string | null
    callLogs?: StringNullableWithAggregatesFilter<"Report"> | string | null
    challenges?: StringNullableWithAggregatesFilter<"Report"> | string | null
    escalations?: StringNullableWithAggregatesFilter<"Report"> | string | null
    additionalActivities?: StringNullableWithAggregatesFilter<"Report"> | string | null
    emailContext?: StringNullableWithAggregatesFilter<"Report"> | string | null
    workEntries?: StringNullableWithAggregatesFilter<"Report"> | string | null
    metricsSummary?: StringNullableWithAggregatesFilter<"Report"> | string | null
    payload?: StringNullableWithAggregatesFilter<"Report"> | string | null
    teamName?: StringNullableWithAggregatesFilter<"Report"> | string | null
    campusLocation?: StringNullableWithAggregatesFilter<"Report"> | string | null
    agentsManaged?: IntNullableWithAggregatesFilter<"Report"> | number | null
    attendanceSummary?: StringNullableWithAggregatesFilter<"Report"> | string | null
    teamKpiAverages?: StringNullableWithAggregatesFilter<"Report"> | string | null
    coachingEntries?: StringNullableWithAggregatesFilter<"Report"> | string | null
    qaObservations?: StringNullableWithAggregatesFilter<"Report"> | string | null
    escalatedIssues?: StringNullableWithAggregatesFilter<"Report"> | string | null
    highlights?: StringNullableWithAggregatesFilter<"Report"> | string | null
    lowlights?: StringNullableWithAggregatesFilter<"Report"> | string | null
    actionPlan?: StringNullableWithAggregatesFilter<"Report"> | string | null
    managerReview?: StringNullableWithAggregatesFilter<"Report"> | string | null
    status?: StringWithAggregatesFilter<"Report"> | string
    supervisorFeedback?: StringNullableWithAggregatesFilter<"Report"> | string | null
    reviewedById?: StringNullableWithAggregatesFilter<"Report"> | string | null
    reviewedAt?: DateTimeNullableWithAggregatesFilter<"Report"> | Date | string | null
    sourceType?: StringWithAggregatesFilter<"Report"> | string
    sourceFileId?: StringNullableWithAggregatesFilter<"Report"> | string | null
    verificationStatus?: StringWithAggregatesFilter<"Report"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Report"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Report"> | Date | string
  }

  export type ReportTemplateWhereInput = {
    AND?: ReportTemplateWhereInput | ReportTemplateWhereInput[]
    OR?: ReportTemplateWhereInput[]
    NOT?: ReportTemplateWhereInput | ReportTemplateWhereInput[]
    id?: StringFilter<"ReportTemplate"> | string
    key?: StringFilter<"ReportTemplate"> | string
    name?: StringFilter<"ReportTemplate"> | string
    description?: StringNullableFilter<"ReportTemplate"> | string | null
    definition?: StringFilter<"ReportTemplate"> | string
    updatedById?: StringNullableFilter<"ReportTemplate"> | string | null
    createdAt?: DateTimeFilter<"ReportTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"ReportTemplate"> | Date | string
    updatedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type ReportTemplateOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    definition?: SortOrder
    updatedById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: UserOrderByWithRelationInput
  }

  export type ReportTemplateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    key?: string
    AND?: ReportTemplateWhereInput | ReportTemplateWhereInput[]
    OR?: ReportTemplateWhereInput[]
    NOT?: ReportTemplateWhereInput | ReportTemplateWhereInput[]
    name?: StringFilter<"ReportTemplate"> | string
    description?: StringNullableFilter<"ReportTemplate"> | string | null
    definition?: StringFilter<"ReportTemplate"> | string
    updatedById?: StringNullableFilter<"ReportTemplate"> | string | null
    createdAt?: DateTimeFilter<"ReportTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"ReportTemplate"> | Date | string
    updatedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "key">

  export type ReportTemplateOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    definition?: SortOrder
    updatedById?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ReportTemplateCountOrderByAggregateInput
    _max?: ReportTemplateMaxOrderByAggregateInput
    _min?: ReportTemplateMinOrderByAggregateInput
  }

  export type ReportTemplateScalarWhereWithAggregatesInput = {
    AND?: ReportTemplateScalarWhereWithAggregatesInput | ReportTemplateScalarWhereWithAggregatesInput[]
    OR?: ReportTemplateScalarWhereWithAggregatesInput[]
    NOT?: ReportTemplateScalarWhereWithAggregatesInput | ReportTemplateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ReportTemplate"> | string
    key?: StringWithAggregatesFilter<"ReportTemplate"> | string
    name?: StringWithAggregatesFilter<"ReportTemplate"> | string
    description?: StringNullableWithAggregatesFilter<"ReportTemplate"> | string | null
    definition?: StringWithAggregatesFilter<"ReportTemplate"> | string
    updatedById?: StringNullableWithAggregatesFilter<"ReportTemplate"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ReportTemplate"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ReportTemplate"> | Date | string
  }

  export type TaskWhereInput = {
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    id?: StringFilter<"Task"> | string
    title?: StringFilter<"Task"> | string
    description?: StringNullableFilter<"Task"> | string | null
    department?: StringFilter<"Task"> | string
    assigneeId?: StringNullableFilter<"Task"> | string | null
    createdById?: StringFilter<"Task"> | string
    category?: StringNullableFilter<"Task"> | string | null
    projectRef?: StringNullableFilter<"Task"> | string | null
    priority?: StringFilter<"Task"> | string
    status?: StringFilter<"Task"> | string
    requiredOutcome?: StringNullableFilter<"Task"> | string | null
    target?: StringNullableFilter<"Task"> | string | null
    kpiKey?: StringNullableFilter<"Task"> | string | null
    dateAssigned?: DateTimeFilter<"Task"> | Date | string
    deadline?: DateTimeNullableFilter<"Task"> | Date | string | null
    estimatedHours?: FloatNullableFilter<"Task"> | number | null
    actualHours?: FloatNullableFilter<"Task"> | number | null
    blocker?: StringNullableFilter<"Task"> | string | null
    nextSteps?: StringNullableFilter<"Task"> | string | null
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    assignee?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type TaskOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    department?: SortOrder
    assigneeId?: SortOrderInput | SortOrder
    createdById?: SortOrder
    category?: SortOrderInput | SortOrder
    projectRef?: SortOrderInput | SortOrder
    priority?: SortOrder
    status?: SortOrder
    requiredOutcome?: SortOrderInput | SortOrder
    target?: SortOrderInput | SortOrder
    kpiKey?: SortOrderInput | SortOrder
    dateAssigned?: SortOrder
    deadline?: SortOrderInput | SortOrder
    estimatedHours?: SortOrderInput | SortOrder
    actualHours?: SortOrderInput | SortOrder
    blocker?: SortOrderInput | SortOrder
    nextSteps?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    assignee?: UserOrderByWithRelationInput
    creator?: UserOrderByWithRelationInput
  }

  export type TaskWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    title?: StringFilter<"Task"> | string
    description?: StringNullableFilter<"Task"> | string | null
    department?: StringFilter<"Task"> | string
    assigneeId?: StringNullableFilter<"Task"> | string | null
    createdById?: StringFilter<"Task"> | string
    category?: StringNullableFilter<"Task"> | string | null
    projectRef?: StringNullableFilter<"Task"> | string | null
    priority?: StringFilter<"Task"> | string
    status?: StringFilter<"Task"> | string
    requiredOutcome?: StringNullableFilter<"Task"> | string | null
    target?: StringNullableFilter<"Task"> | string | null
    kpiKey?: StringNullableFilter<"Task"> | string | null
    dateAssigned?: DateTimeFilter<"Task"> | Date | string
    deadline?: DateTimeNullableFilter<"Task"> | Date | string | null
    estimatedHours?: FloatNullableFilter<"Task"> | number | null
    actualHours?: FloatNullableFilter<"Task"> | number | null
    blocker?: StringNullableFilter<"Task"> | string | null
    nextSteps?: StringNullableFilter<"Task"> | string | null
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    assignee?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    creator?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type TaskOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    department?: SortOrder
    assigneeId?: SortOrderInput | SortOrder
    createdById?: SortOrder
    category?: SortOrderInput | SortOrder
    projectRef?: SortOrderInput | SortOrder
    priority?: SortOrder
    status?: SortOrder
    requiredOutcome?: SortOrderInput | SortOrder
    target?: SortOrderInput | SortOrder
    kpiKey?: SortOrderInput | SortOrder
    dateAssigned?: SortOrder
    deadline?: SortOrderInput | SortOrder
    estimatedHours?: SortOrderInput | SortOrder
    actualHours?: SortOrderInput | SortOrder
    blocker?: SortOrderInput | SortOrder
    nextSteps?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskCountOrderByAggregateInput
    _avg?: TaskAvgOrderByAggregateInput
    _max?: TaskMaxOrderByAggregateInput
    _min?: TaskMinOrderByAggregateInput
    _sum?: TaskSumOrderByAggregateInput
  }

  export type TaskScalarWhereWithAggregatesInput = {
    AND?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    OR?: TaskScalarWhereWithAggregatesInput[]
    NOT?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Task"> | string
    title?: StringWithAggregatesFilter<"Task"> | string
    description?: StringNullableWithAggregatesFilter<"Task"> | string | null
    department?: StringWithAggregatesFilter<"Task"> | string
    assigneeId?: StringNullableWithAggregatesFilter<"Task"> | string | null
    createdById?: StringWithAggregatesFilter<"Task"> | string
    category?: StringNullableWithAggregatesFilter<"Task"> | string | null
    projectRef?: StringNullableWithAggregatesFilter<"Task"> | string | null
    priority?: StringWithAggregatesFilter<"Task"> | string
    status?: StringWithAggregatesFilter<"Task"> | string
    requiredOutcome?: StringNullableWithAggregatesFilter<"Task"> | string | null
    target?: StringNullableWithAggregatesFilter<"Task"> | string | null
    kpiKey?: StringNullableWithAggregatesFilter<"Task"> | string | null
    dateAssigned?: DateTimeWithAggregatesFilter<"Task"> | Date | string
    deadline?: DateTimeNullableWithAggregatesFilter<"Task"> | Date | string | null
    estimatedHours?: FloatNullableWithAggregatesFilter<"Task"> | number | null
    actualHours?: FloatNullableWithAggregatesFilter<"Task"> | number | null
    blocker?: StringNullableWithAggregatesFilter<"Task"> | string | null
    nextSteps?: StringNullableWithAggregatesFilter<"Task"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
  }

  export type UploadedFileWhereInput = {
    AND?: UploadedFileWhereInput | UploadedFileWhereInput[]
    OR?: UploadedFileWhereInput[]
    NOT?: UploadedFileWhereInput | UploadedFileWhereInput[]
    id?: StringFilter<"UploadedFile"> | string
    originalName?: StringFilter<"UploadedFile"> | string
    storedName?: StringFilter<"UploadedFile"> | string
    mimeType?: StringFilter<"UploadedFile"> | string
    sizeBytes?: IntFilter<"UploadedFile"> | number
    fileHash?: StringFilter<"UploadedFile"> | string
    extractStatus?: StringFilter<"UploadedFile"> | string
    extractError?: StringNullableFilter<"UploadedFile"> | string | null
    extractedData?: StringNullableFilter<"UploadedFile"> | string | null
    rawText?: StringNullableFilter<"UploadedFile"> | string | null
    reportDate?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    department?: StringNullableFilter<"UploadedFile"> | string | null
    reportId?: StringNullableFilter<"UploadedFile"> | string | null
    userId?: StringFilter<"UploadedFile"> | string
    confirmedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UploadedFileOrderByWithRelationInput = {
    id?: SortOrder
    originalName?: SortOrder
    storedName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    fileHash?: SortOrder
    extractStatus?: SortOrder
    extractError?: SortOrderInput | SortOrder
    extractedData?: SortOrderInput | SortOrder
    rawText?: SortOrderInput | SortOrder
    reportDate?: SortOrderInput | SortOrder
    department?: SortOrderInput | SortOrder
    reportId?: SortOrderInput | SortOrder
    userId?: SortOrder
    confirmedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UploadedFileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: UploadedFileWhereInput | UploadedFileWhereInput[]
    OR?: UploadedFileWhereInput[]
    NOT?: UploadedFileWhereInput | UploadedFileWhereInput[]
    originalName?: StringFilter<"UploadedFile"> | string
    storedName?: StringFilter<"UploadedFile"> | string
    mimeType?: StringFilter<"UploadedFile"> | string
    sizeBytes?: IntFilter<"UploadedFile"> | number
    fileHash?: StringFilter<"UploadedFile"> | string
    extractStatus?: StringFilter<"UploadedFile"> | string
    extractError?: StringNullableFilter<"UploadedFile"> | string | null
    extractedData?: StringNullableFilter<"UploadedFile"> | string | null
    rawText?: StringNullableFilter<"UploadedFile"> | string | null
    reportDate?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    department?: StringNullableFilter<"UploadedFile"> | string | null
    reportId?: StringNullableFilter<"UploadedFile"> | string | null
    userId?: StringFilter<"UploadedFile"> | string
    confirmedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type UploadedFileOrderByWithAggregationInput = {
    id?: SortOrder
    originalName?: SortOrder
    storedName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    fileHash?: SortOrder
    extractStatus?: SortOrder
    extractError?: SortOrderInput | SortOrder
    extractedData?: SortOrderInput | SortOrder
    rawText?: SortOrderInput | SortOrder
    reportDate?: SortOrderInput | SortOrder
    department?: SortOrderInput | SortOrder
    reportId?: SortOrderInput | SortOrder
    userId?: SortOrder
    confirmedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: UploadedFileCountOrderByAggregateInput
    _avg?: UploadedFileAvgOrderByAggregateInput
    _max?: UploadedFileMaxOrderByAggregateInput
    _min?: UploadedFileMinOrderByAggregateInput
    _sum?: UploadedFileSumOrderByAggregateInput
  }

  export type UploadedFileScalarWhereWithAggregatesInput = {
    AND?: UploadedFileScalarWhereWithAggregatesInput | UploadedFileScalarWhereWithAggregatesInput[]
    OR?: UploadedFileScalarWhereWithAggregatesInput[]
    NOT?: UploadedFileScalarWhereWithAggregatesInput | UploadedFileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"UploadedFile"> | string
    originalName?: StringWithAggregatesFilter<"UploadedFile"> | string
    storedName?: StringWithAggregatesFilter<"UploadedFile"> | string
    mimeType?: StringWithAggregatesFilter<"UploadedFile"> | string
    sizeBytes?: IntWithAggregatesFilter<"UploadedFile"> | number
    fileHash?: StringWithAggregatesFilter<"UploadedFile"> | string
    extractStatus?: StringWithAggregatesFilter<"UploadedFile"> | string
    extractError?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    extractedData?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    rawText?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    reportDate?: DateTimeNullableWithAggregatesFilter<"UploadedFile"> | Date | string | null
    department?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    reportId?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    userId?: StringWithAggregatesFilter<"UploadedFile"> | string
    confirmedAt?: DateTimeNullableWithAggregatesFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UploadedFile"> | Date | string
  }

  export type NotificationWhereInput = {
    AND?: NotificationWhereInput | NotificationWhereInput[]
    OR?: NotificationWhereInput[]
    NOT?: NotificationWhereInput | NotificationWhereInput[]
    id?: StringFilter<"Notification"> | string
    userId?: StringFilter<"Notification"> | string
    type?: StringFilter<"Notification"> | string
    severity?: StringFilter<"Notification"> | string
    title?: StringFilter<"Notification"> | string
    message?: StringFilter<"Notification"> | string
    linkData?: StringNullableFilter<"Notification"> | string | null
    read?: BoolFilter<"Notification"> | boolean
    dedupeKey?: StringNullableFilter<"Notification"> | string | null
    createdAt?: DateTimeFilter<"Notification"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type NotificationOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    title?: SortOrder
    message?: SortOrder
    linkData?: SortOrderInput | SortOrder
    read?: SortOrder
    dedupeKey?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type NotificationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    dedupeKey?: string
    AND?: NotificationWhereInput | NotificationWhereInput[]
    OR?: NotificationWhereInput[]
    NOT?: NotificationWhereInput | NotificationWhereInput[]
    userId?: StringFilter<"Notification"> | string
    type?: StringFilter<"Notification"> | string
    severity?: StringFilter<"Notification"> | string
    title?: StringFilter<"Notification"> | string
    message?: StringFilter<"Notification"> | string
    linkData?: StringNullableFilter<"Notification"> | string | null
    read?: BoolFilter<"Notification"> | boolean
    createdAt?: DateTimeFilter<"Notification"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "dedupeKey">

  export type NotificationOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    title?: SortOrder
    message?: SortOrder
    linkData?: SortOrderInput | SortOrder
    read?: SortOrder
    dedupeKey?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: NotificationCountOrderByAggregateInput
    _max?: NotificationMaxOrderByAggregateInput
    _min?: NotificationMinOrderByAggregateInput
  }

  export type NotificationScalarWhereWithAggregatesInput = {
    AND?: NotificationScalarWhereWithAggregatesInput | NotificationScalarWhereWithAggregatesInput[]
    OR?: NotificationScalarWhereWithAggregatesInput[]
    NOT?: NotificationScalarWhereWithAggregatesInput | NotificationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Notification"> | string
    userId?: StringWithAggregatesFilter<"Notification"> | string
    type?: StringWithAggregatesFilter<"Notification"> | string
    severity?: StringWithAggregatesFilter<"Notification"> | string
    title?: StringWithAggregatesFilter<"Notification"> | string
    message?: StringWithAggregatesFilter<"Notification"> | string
    linkData?: StringNullableWithAggregatesFilter<"Notification"> | string | null
    read?: BoolWithAggregatesFilter<"Notification"> | boolean
    dedupeKey?: StringNullableWithAggregatesFilter<"Notification"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Notification"> | Date | string
  }

  export type KpiConfigWhereInput = {
    AND?: KpiConfigWhereInput | KpiConfigWhereInput[]
    OR?: KpiConfigWhereInput[]
    NOT?: KpiConfigWhereInput | KpiConfigWhereInput[]
    id?: StringFilter<"KpiConfig"> | string
    department?: StringFilter<"KpiConfig"> | string
    key?: StringFilter<"KpiConfig"> | string
    label?: StringFilter<"KpiConfig"> | string
    category?: StringFilter<"KpiConfig"> | string
    unit?: StringFilter<"KpiConfig"> | string
    direction?: StringFilter<"KpiConfig"> | string
    defaultTarget?: FloatNullableFilter<"KpiConfig"> | number | null
    derivedFrom?: StringNullableFilter<"KpiConfig"> | string | null
    mandatory?: BoolFilter<"KpiConfig"> | boolean
    active?: BoolFilter<"KpiConfig"> | boolean
    sortOrder?: IntFilter<"KpiConfig"> | number
  }

  export type KpiConfigOrderByWithRelationInput = {
    id?: SortOrder
    department?: SortOrder
    key?: SortOrder
    label?: SortOrder
    category?: SortOrder
    unit?: SortOrder
    direction?: SortOrder
    defaultTarget?: SortOrderInput | SortOrder
    derivedFrom?: SortOrderInput | SortOrder
    mandatory?: SortOrder
    active?: SortOrder
    sortOrder?: SortOrder
  }

  export type KpiConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    department_key?: KpiConfigDepartmentKeyCompoundUniqueInput
    AND?: KpiConfigWhereInput | KpiConfigWhereInput[]
    OR?: KpiConfigWhereInput[]
    NOT?: KpiConfigWhereInput | KpiConfigWhereInput[]
    department?: StringFilter<"KpiConfig"> | string
    key?: StringFilter<"KpiConfig"> | string
    label?: StringFilter<"KpiConfig"> | string
    category?: StringFilter<"KpiConfig"> | string
    unit?: StringFilter<"KpiConfig"> | string
    direction?: StringFilter<"KpiConfig"> | string
    defaultTarget?: FloatNullableFilter<"KpiConfig"> | number | null
    derivedFrom?: StringNullableFilter<"KpiConfig"> | string | null
    mandatory?: BoolFilter<"KpiConfig"> | boolean
    active?: BoolFilter<"KpiConfig"> | boolean
    sortOrder?: IntFilter<"KpiConfig"> | number
  }, "id" | "department_key">

  export type KpiConfigOrderByWithAggregationInput = {
    id?: SortOrder
    department?: SortOrder
    key?: SortOrder
    label?: SortOrder
    category?: SortOrder
    unit?: SortOrder
    direction?: SortOrder
    defaultTarget?: SortOrderInput | SortOrder
    derivedFrom?: SortOrderInput | SortOrder
    mandatory?: SortOrder
    active?: SortOrder
    sortOrder?: SortOrder
    _count?: KpiConfigCountOrderByAggregateInput
    _avg?: KpiConfigAvgOrderByAggregateInput
    _max?: KpiConfigMaxOrderByAggregateInput
    _min?: KpiConfigMinOrderByAggregateInput
    _sum?: KpiConfigSumOrderByAggregateInput
  }

  export type KpiConfigScalarWhereWithAggregatesInput = {
    AND?: KpiConfigScalarWhereWithAggregatesInput | KpiConfigScalarWhereWithAggregatesInput[]
    OR?: KpiConfigScalarWhereWithAggregatesInput[]
    NOT?: KpiConfigScalarWhereWithAggregatesInput | KpiConfigScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"KpiConfig"> | string
    department?: StringWithAggregatesFilter<"KpiConfig"> | string
    key?: StringWithAggregatesFilter<"KpiConfig"> | string
    label?: StringWithAggregatesFilter<"KpiConfig"> | string
    category?: StringWithAggregatesFilter<"KpiConfig"> | string
    unit?: StringWithAggregatesFilter<"KpiConfig"> | string
    direction?: StringWithAggregatesFilter<"KpiConfig"> | string
    defaultTarget?: FloatNullableWithAggregatesFilter<"KpiConfig"> | number | null
    derivedFrom?: StringNullableWithAggregatesFilter<"KpiConfig"> | string | null
    mandatory?: BoolWithAggregatesFilter<"KpiConfig"> | boolean
    active?: BoolWithAggregatesFilter<"KpiConfig"> | boolean
    sortOrder?: IntWithAggregatesFilter<"KpiConfig"> | number
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringNullableFilter<"AuditLog"> | string | null
    actorName?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    actorName?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    userId?: StringNullableFilter<"AuditLog"> | string | null
    actorName?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    actorName?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuditLog"> | string
    userId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    actorName?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    action?: StringWithAggregatesFilter<"AuditLog"> | string
    entity?: StringWithAggregatesFilter<"AuditLog"> | string
    entityId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    details?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type SystemFlagWhereInput = {
    AND?: SystemFlagWhereInput | SystemFlagWhereInput[]
    OR?: SystemFlagWhereInput[]
    NOT?: SystemFlagWhereInput | SystemFlagWhereInput[]
    key?: StringFilter<"SystemFlag"> | string
    value?: StringFilter<"SystemFlag"> | string
    updatedAt?: DateTimeFilter<"SystemFlag"> | Date | string
  }

  export type SystemFlagOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemFlagWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: SystemFlagWhereInput | SystemFlagWhereInput[]
    OR?: SystemFlagWhereInput[]
    NOT?: SystemFlagWhereInput | SystemFlagWhereInput[]
    value?: StringFilter<"SystemFlag"> | string
    updatedAt?: DateTimeFilter<"SystemFlag"> | Date | string
  }, "key">

  export type SystemFlagOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
    _count?: SystemFlagCountOrderByAggregateInput
    _max?: SystemFlagMaxOrderByAggregateInput
    _min?: SystemFlagMinOrderByAggregateInput
  }

  export type SystemFlagScalarWhereWithAggregatesInput = {
    AND?: SystemFlagScalarWhereWithAggregatesInput | SystemFlagScalarWhereWithAggregatesInput[]
    OR?: SystemFlagScalarWhereWithAggregatesInput[]
    NOT?: SystemFlagScalarWhereWithAggregatesInput | SystemFlagScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"SystemFlag"> | string
    value?: StringWithAggregatesFilter<"SystemFlag"> | string
    updatedAt?: DateTimeWithAggregatesFilter<"SystemFlag"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportCreateInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutReportsInput
    reviewer?: UserCreateNestedOneWithoutReviewedReportsInput
  }

  export type ReportUncheckedCreateInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    userId: string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedById?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutReportsNestedInput
    reviewer?: UserUpdateOneWithoutReviewedReportsNestedInput
  }

  export type ReportUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedById?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportCreateManyInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    userId: string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedById?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedById?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateCreateInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    createdAt?: Date | string
    updatedAt?: Date | string
    updatedBy?: UserCreateNestedOneWithoutUpdatedTemplatesInput
  }

  export type ReportTemplateUncheckedCreateInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    updatedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportTemplateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedBy?: UserUpdateOneWithoutUpdatedTemplatesNestedInput
  }

  export type ReportTemplateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateCreateManyInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    updatedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportTemplateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    updatedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    assignee?: UserCreateNestedOneWithoutAssignedTasksInput
    creator: UserCreateNestedOneWithoutCreatedTasksInput
  }

  export type TaskUncheckedCreateInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    assigneeId?: string | null
    createdById: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignee?: UserUpdateOneWithoutAssignedTasksNestedInput
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
  }

  export type TaskUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    assigneeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateManyInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    assigneeId?: string | null
    createdById: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    assigneeId?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileCreateInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    confirmedAt?: Date | string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutUploadedFilesInput
  }

  export type UploadedFileUncheckedCreateInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    userId: string
    confirmedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type UploadedFileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUploadedFilesNestedInput
  }

  export type UploadedFileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileCreateManyInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    userId: string
    confirmedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type UploadedFileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationCreateInput = {
    id?: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutNotificationsInput
  }

  export type NotificationUncheckedCreateInput = {
    id?: string
    userId: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
  }

  export type NotificationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutNotificationsNestedInput
  }

  export type NotificationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationCreateManyInput = {
    id?: string
    userId: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
  }

  export type NotificationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type KpiConfigCreateInput = {
    id?: string
    department: string
    key: string
    label: string
    category: string
    unit?: string
    direction?: string
    defaultTarget?: number | null
    derivedFrom?: string | null
    mandatory?: boolean
    active?: boolean
    sortOrder?: number
  }

  export type KpiConfigUncheckedCreateInput = {
    id?: string
    department: string
    key: string
    label: string
    category: string
    unit?: string
    direction?: string
    defaultTarget?: number | null
    derivedFrom?: string | null
    mandatory?: boolean
    active?: boolean
    sortOrder?: number
  }

  export type KpiConfigUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    defaultTarget?: NullableFloatFieldUpdateOperationsInput | number | null
    derivedFrom?: NullableStringFieldUpdateOperationsInput | string | null
    mandatory?: BoolFieldUpdateOperationsInput | boolean
    active?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
  }

  export type KpiConfigUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    defaultTarget?: NullableFloatFieldUpdateOperationsInput | number | null
    derivedFrom?: NullableStringFieldUpdateOperationsInput | string | null
    mandatory?: BoolFieldUpdateOperationsInput | boolean
    active?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
  }

  export type KpiConfigCreateManyInput = {
    id?: string
    department: string
    key: string
    label: string
    category: string
    unit?: string
    direction?: string
    defaultTarget?: number | null
    derivedFrom?: string | null
    mandatory?: boolean
    active?: boolean
    sortOrder?: number
  }

  export type KpiConfigUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    defaultTarget?: NullableFloatFieldUpdateOperationsInput | number | null
    derivedFrom?: NullableStringFieldUpdateOperationsInput | string | null
    mandatory?: BoolFieldUpdateOperationsInput | boolean
    active?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
  }

  export type KpiConfigUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    unit?: StringFieldUpdateOperationsInput | string
    direction?: StringFieldUpdateOperationsInput | string
    defaultTarget?: NullableFloatFieldUpdateOperationsInput | number | null
    derivedFrom?: NullableStringFieldUpdateOperationsInput | string | null
    mandatory?: BoolFieldUpdateOperationsInput | boolean
    active?: BoolFieldUpdateOperationsInput | boolean
    sortOrder?: IntFieldUpdateOperationsInput | number
  }

  export type AuditLogCreateInput = {
    id?: string
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
    user?: UserCreateNestedOneWithoutAuditLogsInput
  }

  export type AuditLogUncheckedCreateInput = {
    id?: string
    userId?: string | null
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutAuditLogsNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    id?: string
    userId?: string | null
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemFlagCreateInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type SystemFlagUncheckedCreateInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type SystemFlagUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemFlagUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemFlagCreateManyInput = {
    key: string
    value: string
    updatedAt?: Date | string
  }

  export type SystemFlagUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SystemFlagUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ReportListRelationFilter = {
    every?: ReportWhereInput
    some?: ReportWhereInput
    none?: ReportWhereInput
  }

  export type TaskListRelationFilter = {
    every?: TaskWhereInput
    some?: TaskWhereInput
    none?: TaskWhereInput
  }

  export type NotificationListRelationFilter = {
    every?: NotificationWhereInput
    some?: NotificationWhereInput
    none?: NotificationWhereInput
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type UploadedFileListRelationFilter = {
    every?: UploadedFileWhereInput
    some?: UploadedFileWhereInput
    none?: UploadedFileWhereInput
  }

  export type ReportTemplateListRelationFilter = {
    every?: ReportTemplateWhereInput
    some?: ReportTemplateWhereInput
    none?: ReportTemplateWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ReportOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type NotificationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UploadedFileOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ReportTemplateOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    department?: SortOrder
    team?: SortOrder
    employeeId?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    department?: SortOrder
    team?: SortOrder
    employeeId?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    fullName?: SortOrder
    role?: SortOrder
    department?: SortOrder
    team?: SortOrder
    employeeId?: SortOrder
    phone?: SortOrder
    status?: SortOrder
    approvedAt?: SortOrder
    approvedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type ReportCountOrderByAggregateInput = {
    id?: SortOrder
    ref?: SortOrder
    type?: SortOrder
    reportDate?: SortOrder
    userId?: SortOrder
    department?: SortOrder
    shiftTime?: SortOrder
    clockIn?: SortOrder
    clockOut?: SortOrder
    attendanceStatus?: SortOrder
    latenessMins?: SortOrder
    kpiMetrics?: SortOrder
    callLogs?: SortOrder
    challenges?: SortOrder
    escalations?: SortOrder
    additionalActivities?: SortOrder
    emailContext?: SortOrder
    workEntries?: SortOrder
    metricsSummary?: SortOrder
    payload?: SortOrder
    teamName?: SortOrder
    campusLocation?: SortOrder
    agentsManaged?: SortOrder
    attendanceSummary?: SortOrder
    teamKpiAverages?: SortOrder
    coachingEntries?: SortOrder
    qaObservations?: SortOrder
    escalatedIssues?: SortOrder
    highlights?: SortOrder
    lowlights?: SortOrder
    actionPlan?: SortOrder
    managerReview?: SortOrder
    status?: SortOrder
    supervisorFeedback?: SortOrder
    reviewedById?: SortOrder
    reviewedAt?: SortOrder
    sourceType?: SortOrder
    sourceFileId?: SortOrder
    verificationStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportAvgOrderByAggregateInput = {
    latenessMins?: SortOrder
    agentsManaged?: SortOrder
  }

  export type ReportMaxOrderByAggregateInput = {
    id?: SortOrder
    ref?: SortOrder
    type?: SortOrder
    reportDate?: SortOrder
    userId?: SortOrder
    department?: SortOrder
    shiftTime?: SortOrder
    clockIn?: SortOrder
    clockOut?: SortOrder
    attendanceStatus?: SortOrder
    latenessMins?: SortOrder
    kpiMetrics?: SortOrder
    callLogs?: SortOrder
    challenges?: SortOrder
    escalations?: SortOrder
    additionalActivities?: SortOrder
    emailContext?: SortOrder
    workEntries?: SortOrder
    metricsSummary?: SortOrder
    payload?: SortOrder
    teamName?: SortOrder
    campusLocation?: SortOrder
    agentsManaged?: SortOrder
    attendanceSummary?: SortOrder
    teamKpiAverages?: SortOrder
    coachingEntries?: SortOrder
    qaObservations?: SortOrder
    escalatedIssues?: SortOrder
    highlights?: SortOrder
    lowlights?: SortOrder
    actionPlan?: SortOrder
    managerReview?: SortOrder
    status?: SortOrder
    supervisorFeedback?: SortOrder
    reviewedById?: SortOrder
    reviewedAt?: SortOrder
    sourceType?: SortOrder
    sourceFileId?: SortOrder
    verificationStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportMinOrderByAggregateInput = {
    id?: SortOrder
    ref?: SortOrder
    type?: SortOrder
    reportDate?: SortOrder
    userId?: SortOrder
    department?: SortOrder
    shiftTime?: SortOrder
    clockIn?: SortOrder
    clockOut?: SortOrder
    attendanceStatus?: SortOrder
    latenessMins?: SortOrder
    kpiMetrics?: SortOrder
    callLogs?: SortOrder
    challenges?: SortOrder
    escalations?: SortOrder
    additionalActivities?: SortOrder
    emailContext?: SortOrder
    workEntries?: SortOrder
    metricsSummary?: SortOrder
    payload?: SortOrder
    teamName?: SortOrder
    campusLocation?: SortOrder
    agentsManaged?: SortOrder
    attendanceSummary?: SortOrder
    teamKpiAverages?: SortOrder
    coachingEntries?: SortOrder
    qaObservations?: SortOrder
    escalatedIssues?: SortOrder
    highlights?: SortOrder
    lowlights?: SortOrder
    actionPlan?: SortOrder
    managerReview?: SortOrder
    status?: SortOrder
    supervisorFeedback?: SortOrder
    reviewedById?: SortOrder
    reviewedAt?: SortOrder
    sourceType?: SortOrder
    sourceFileId?: SortOrder
    verificationStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportSumOrderByAggregateInput = {
    latenessMins?: SortOrder
    agentsManaged?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type ReportTemplateCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    name?: SortOrder
    description?: SortOrder
    definition?: SortOrder
    updatedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportTemplateMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    name?: SortOrder
    description?: SortOrder
    definition?: SortOrder
    updatedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportTemplateMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    name?: SortOrder
    description?: SortOrder
    definition?: SortOrder
    updatedById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type TaskCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    department?: SortOrder
    assigneeId?: SortOrder
    createdById?: SortOrder
    category?: SortOrder
    projectRef?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    requiredOutcome?: SortOrder
    target?: SortOrder
    kpiKey?: SortOrder
    dateAssigned?: SortOrder
    deadline?: SortOrder
    estimatedHours?: SortOrder
    actualHours?: SortOrder
    blocker?: SortOrder
    nextSteps?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskAvgOrderByAggregateInput = {
    estimatedHours?: SortOrder
    actualHours?: SortOrder
  }

  export type TaskMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    department?: SortOrder
    assigneeId?: SortOrder
    createdById?: SortOrder
    category?: SortOrder
    projectRef?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    requiredOutcome?: SortOrder
    target?: SortOrder
    kpiKey?: SortOrder
    dateAssigned?: SortOrder
    deadline?: SortOrder
    estimatedHours?: SortOrder
    actualHours?: SortOrder
    blocker?: SortOrder
    nextSteps?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    department?: SortOrder
    assigneeId?: SortOrder
    createdById?: SortOrder
    category?: SortOrder
    projectRef?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    requiredOutcome?: SortOrder
    target?: SortOrder
    kpiKey?: SortOrder
    dateAssigned?: SortOrder
    deadline?: SortOrder
    estimatedHours?: SortOrder
    actualHours?: SortOrder
    blocker?: SortOrder
    nextSteps?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSumOrderByAggregateInput = {
    estimatedHours?: SortOrder
    actualHours?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type UploadedFileCountOrderByAggregateInput = {
    id?: SortOrder
    originalName?: SortOrder
    storedName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    fileHash?: SortOrder
    extractStatus?: SortOrder
    extractError?: SortOrder
    extractedData?: SortOrder
    rawText?: SortOrder
    reportDate?: SortOrder
    department?: SortOrder
    reportId?: SortOrder
    userId?: SortOrder
    confirmedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type UploadedFileAvgOrderByAggregateInput = {
    sizeBytes?: SortOrder
  }

  export type UploadedFileMaxOrderByAggregateInput = {
    id?: SortOrder
    originalName?: SortOrder
    storedName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    fileHash?: SortOrder
    extractStatus?: SortOrder
    extractError?: SortOrder
    extractedData?: SortOrder
    rawText?: SortOrder
    reportDate?: SortOrder
    department?: SortOrder
    reportId?: SortOrder
    userId?: SortOrder
    confirmedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type UploadedFileMinOrderByAggregateInput = {
    id?: SortOrder
    originalName?: SortOrder
    storedName?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    fileHash?: SortOrder
    extractStatus?: SortOrder
    extractError?: SortOrder
    extractedData?: SortOrder
    rawText?: SortOrder
    reportDate?: SortOrder
    department?: SortOrder
    reportId?: SortOrder
    userId?: SortOrder
    confirmedAt?: SortOrder
    createdAt?: SortOrder
  }

  export type UploadedFileSumOrderByAggregateInput = {
    sizeBytes?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NotificationCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    title?: SortOrder
    message?: SortOrder
    linkData?: SortOrder
    read?: SortOrder
    dedupeKey?: SortOrder
    createdAt?: SortOrder
  }

  export type NotificationMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    title?: SortOrder
    message?: SortOrder
    linkData?: SortOrder
    read?: SortOrder
    dedupeKey?: SortOrder
    createdAt?: SortOrder
  }

  export type NotificationMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    title?: SortOrder
    message?: SortOrder
    linkData?: SortOrder
    read?: SortOrder
    dedupeKey?: SortOrder
    createdAt?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type KpiConfigDepartmentKeyCompoundUniqueInput = {
    department: string
    key: string
  }

  export type KpiConfigCountOrderByAggregateInput = {
    id?: SortOrder
    department?: SortOrder
    key?: SortOrder
    label?: SortOrder
    category?: SortOrder
    unit?: SortOrder
    direction?: SortOrder
    defaultTarget?: SortOrder
    derivedFrom?: SortOrder
    mandatory?: SortOrder
    active?: SortOrder
    sortOrder?: SortOrder
  }

  export type KpiConfigAvgOrderByAggregateInput = {
    defaultTarget?: SortOrder
    sortOrder?: SortOrder
  }

  export type KpiConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    department?: SortOrder
    key?: SortOrder
    label?: SortOrder
    category?: SortOrder
    unit?: SortOrder
    direction?: SortOrder
    defaultTarget?: SortOrder
    derivedFrom?: SortOrder
    mandatory?: SortOrder
    active?: SortOrder
    sortOrder?: SortOrder
  }

  export type KpiConfigMinOrderByAggregateInput = {
    id?: SortOrder
    department?: SortOrder
    key?: SortOrder
    label?: SortOrder
    category?: SortOrder
    unit?: SortOrder
    direction?: SortOrder
    defaultTarget?: SortOrder
    derivedFrom?: SortOrder
    mandatory?: SortOrder
    active?: SortOrder
    sortOrder?: SortOrder
  }

  export type KpiConfigSumOrderByAggregateInput = {
    defaultTarget?: SortOrder
    sortOrder?: SortOrder
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actorName?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actorName?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    actorName?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type SystemFlagCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemFlagMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type SystemFlagMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updatedAt?: SortOrder
  }

  export type ReportCreateNestedManyWithoutUserInput = {
    create?: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput> | ReportCreateWithoutUserInput[] | ReportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutUserInput | ReportCreateOrConnectWithoutUserInput[]
    createMany?: ReportCreateManyUserInputEnvelope
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
  }

  export type ReportCreateNestedManyWithoutReviewerInput = {
    create?: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput> | ReportCreateWithoutReviewerInput[] | ReportUncheckedCreateWithoutReviewerInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutReviewerInput | ReportCreateOrConnectWithoutReviewerInput[]
    createMany?: ReportCreateManyReviewerInputEnvelope
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutAssigneeInput = {
    create?: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput> | TaskCreateWithoutAssigneeInput[] | TaskUncheckedCreateWithoutAssigneeInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssigneeInput | TaskCreateOrConnectWithoutAssigneeInput[]
    createMany?: TaskCreateManyAssigneeInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutCreatorInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type NotificationCreateNestedManyWithoutUserInput = {
    create?: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput> | NotificationCreateWithoutUserInput[] | NotificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: NotificationCreateOrConnectWithoutUserInput | NotificationCreateOrConnectWithoutUserInput[]
    createMany?: NotificationCreateManyUserInputEnvelope
    connect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
  }

  export type AuditLogCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type UploadedFileCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
  }

  export type ReportTemplateCreateNestedManyWithoutUpdatedByInput = {
    create?: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput> | ReportTemplateCreateWithoutUpdatedByInput[] | ReportTemplateUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: ReportTemplateCreateOrConnectWithoutUpdatedByInput | ReportTemplateCreateOrConnectWithoutUpdatedByInput[]
    createMany?: ReportTemplateCreateManyUpdatedByInputEnvelope
    connect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
  }

  export type ReportUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput> | ReportCreateWithoutUserInput[] | ReportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutUserInput | ReportCreateOrConnectWithoutUserInput[]
    createMany?: ReportCreateManyUserInputEnvelope
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
  }

  export type ReportUncheckedCreateNestedManyWithoutReviewerInput = {
    create?: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput> | ReportCreateWithoutReviewerInput[] | ReportUncheckedCreateWithoutReviewerInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutReviewerInput | ReportCreateOrConnectWithoutReviewerInput[]
    createMany?: ReportCreateManyReviewerInputEnvelope
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutAssigneeInput = {
    create?: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput> | TaskCreateWithoutAssigneeInput[] | TaskUncheckedCreateWithoutAssigneeInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssigneeInput | TaskCreateOrConnectWithoutAssigneeInput[]
    createMany?: TaskCreateManyAssigneeInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutCreatorInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type NotificationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput> | NotificationCreateWithoutUserInput[] | NotificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: NotificationCreateOrConnectWithoutUserInput | NotificationCreateOrConnectWithoutUserInput[]
    createMany?: NotificationCreateManyUserInputEnvelope
    connect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type UploadedFileUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
  }

  export type ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput = {
    create?: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput> | ReportTemplateCreateWithoutUpdatedByInput[] | ReportTemplateUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: ReportTemplateCreateOrConnectWithoutUpdatedByInput | ReportTemplateCreateOrConnectWithoutUpdatedByInput[]
    createMany?: ReportTemplateCreateManyUpdatedByInputEnvelope
    connect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ReportUpdateManyWithoutUserNestedInput = {
    create?: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput> | ReportCreateWithoutUserInput[] | ReportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutUserInput | ReportCreateOrConnectWithoutUserInput[]
    upsert?: ReportUpsertWithWhereUniqueWithoutUserInput | ReportUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ReportCreateManyUserInputEnvelope
    set?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    disconnect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    delete?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    update?: ReportUpdateWithWhereUniqueWithoutUserInput | ReportUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ReportUpdateManyWithWhereWithoutUserInput | ReportUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ReportScalarWhereInput | ReportScalarWhereInput[]
  }

  export type ReportUpdateManyWithoutReviewerNestedInput = {
    create?: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput> | ReportCreateWithoutReviewerInput[] | ReportUncheckedCreateWithoutReviewerInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutReviewerInput | ReportCreateOrConnectWithoutReviewerInput[]
    upsert?: ReportUpsertWithWhereUniqueWithoutReviewerInput | ReportUpsertWithWhereUniqueWithoutReviewerInput[]
    createMany?: ReportCreateManyReviewerInputEnvelope
    set?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    disconnect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    delete?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    update?: ReportUpdateWithWhereUniqueWithoutReviewerInput | ReportUpdateWithWhereUniqueWithoutReviewerInput[]
    updateMany?: ReportUpdateManyWithWhereWithoutReviewerInput | ReportUpdateManyWithWhereWithoutReviewerInput[]
    deleteMany?: ReportScalarWhereInput | ReportScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutAssigneeNestedInput = {
    create?: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput> | TaskCreateWithoutAssigneeInput[] | TaskUncheckedCreateWithoutAssigneeInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssigneeInput | TaskCreateOrConnectWithoutAssigneeInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutAssigneeInput | TaskUpsertWithWhereUniqueWithoutAssigneeInput[]
    createMany?: TaskCreateManyAssigneeInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutAssigneeInput | TaskUpdateWithWhereUniqueWithoutAssigneeInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutAssigneeInput | TaskUpdateManyWithWhereWithoutAssigneeInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatorInput | TaskUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatorInput | TaskUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatorInput | TaskUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type NotificationUpdateManyWithoutUserNestedInput = {
    create?: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput> | NotificationCreateWithoutUserInput[] | NotificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: NotificationCreateOrConnectWithoutUserInput | NotificationCreateOrConnectWithoutUserInput[]
    upsert?: NotificationUpsertWithWhereUniqueWithoutUserInput | NotificationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: NotificationCreateManyUserInputEnvelope
    set?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    disconnect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    delete?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    connect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    update?: NotificationUpdateWithWhereUniqueWithoutUserInput | NotificationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: NotificationUpdateManyWithWhereWithoutUserInput | NotificationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: NotificationScalarWhereInput | NotificationScalarWhereInput[]
  }

  export type AuditLogUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type UploadedFileUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    upsert?: UploadedFileUpsertWithWhereUniqueWithoutUserInput | UploadedFileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    set?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    disconnect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    delete?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    update?: UploadedFileUpdateWithWhereUniqueWithoutUserInput | UploadedFileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadedFileUpdateManyWithWhereWithoutUserInput | UploadedFileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
  }

  export type ReportTemplateUpdateManyWithoutUpdatedByNestedInput = {
    create?: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput> | ReportTemplateCreateWithoutUpdatedByInput[] | ReportTemplateUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: ReportTemplateCreateOrConnectWithoutUpdatedByInput | ReportTemplateCreateOrConnectWithoutUpdatedByInput[]
    upsert?: ReportTemplateUpsertWithWhereUniqueWithoutUpdatedByInput | ReportTemplateUpsertWithWhereUniqueWithoutUpdatedByInput[]
    createMany?: ReportTemplateCreateManyUpdatedByInputEnvelope
    set?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    disconnect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    delete?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    connect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    update?: ReportTemplateUpdateWithWhereUniqueWithoutUpdatedByInput | ReportTemplateUpdateWithWhereUniqueWithoutUpdatedByInput[]
    updateMany?: ReportTemplateUpdateManyWithWhereWithoutUpdatedByInput | ReportTemplateUpdateManyWithWhereWithoutUpdatedByInput[]
    deleteMany?: ReportTemplateScalarWhereInput | ReportTemplateScalarWhereInput[]
  }

  export type ReportUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput> | ReportCreateWithoutUserInput[] | ReportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutUserInput | ReportCreateOrConnectWithoutUserInput[]
    upsert?: ReportUpsertWithWhereUniqueWithoutUserInput | ReportUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ReportCreateManyUserInputEnvelope
    set?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    disconnect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    delete?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    update?: ReportUpdateWithWhereUniqueWithoutUserInput | ReportUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ReportUpdateManyWithWhereWithoutUserInput | ReportUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ReportScalarWhereInput | ReportScalarWhereInput[]
  }

  export type ReportUncheckedUpdateManyWithoutReviewerNestedInput = {
    create?: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput> | ReportCreateWithoutReviewerInput[] | ReportUncheckedCreateWithoutReviewerInput[]
    connectOrCreate?: ReportCreateOrConnectWithoutReviewerInput | ReportCreateOrConnectWithoutReviewerInput[]
    upsert?: ReportUpsertWithWhereUniqueWithoutReviewerInput | ReportUpsertWithWhereUniqueWithoutReviewerInput[]
    createMany?: ReportCreateManyReviewerInputEnvelope
    set?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    disconnect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    delete?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    connect?: ReportWhereUniqueInput | ReportWhereUniqueInput[]
    update?: ReportUpdateWithWhereUniqueWithoutReviewerInput | ReportUpdateWithWhereUniqueWithoutReviewerInput[]
    updateMany?: ReportUpdateManyWithWhereWithoutReviewerInput | ReportUpdateManyWithWhereWithoutReviewerInput[]
    deleteMany?: ReportScalarWhereInput | ReportScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutAssigneeNestedInput = {
    create?: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput> | TaskCreateWithoutAssigneeInput[] | TaskUncheckedCreateWithoutAssigneeInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssigneeInput | TaskCreateOrConnectWithoutAssigneeInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutAssigneeInput | TaskUpsertWithWhereUniqueWithoutAssigneeInput[]
    createMany?: TaskCreateManyAssigneeInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutAssigneeInput | TaskUpdateWithWhereUniqueWithoutAssigneeInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutAssigneeInput | TaskUpdateManyWithWhereWithoutAssigneeInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutCreatorNestedInput = {
    create?: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput> | TaskCreateWithoutCreatorInput[] | TaskUncheckedCreateWithoutCreatorInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatorInput | TaskCreateOrConnectWithoutCreatorInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatorInput | TaskUpsertWithWhereUniqueWithoutCreatorInput[]
    createMany?: TaskCreateManyCreatorInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatorInput | TaskUpdateWithWhereUniqueWithoutCreatorInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatorInput | TaskUpdateManyWithWhereWithoutCreatorInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type NotificationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput> | NotificationCreateWithoutUserInput[] | NotificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: NotificationCreateOrConnectWithoutUserInput | NotificationCreateOrConnectWithoutUserInput[]
    upsert?: NotificationUpsertWithWhereUniqueWithoutUserInput | NotificationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: NotificationCreateManyUserInputEnvelope
    set?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    disconnect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    delete?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    connect?: NotificationWhereUniqueInput | NotificationWhereUniqueInput[]
    update?: NotificationUpdateWithWhereUniqueWithoutUserInput | NotificationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: NotificationUpdateManyWithWhereWithoutUserInput | NotificationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: NotificationScalarWhereInput | NotificationScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type UploadedFileUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    upsert?: UploadedFileUpsertWithWhereUniqueWithoutUserInput | UploadedFileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    set?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    disconnect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    delete?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    update?: UploadedFileUpdateWithWhereUniqueWithoutUserInput | UploadedFileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadedFileUpdateManyWithWhereWithoutUserInput | UploadedFileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
  }

  export type ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput = {
    create?: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput> | ReportTemplateCreateWithoutUpdatedByInput[] | ReportTemplateUncheckedCreateWithoutUpdatedByInput[]
    connectOrCreate?: ReportTemplateCreateOrConnectWithoutUpdatedByInput | ReportTemplateCreateOrConnectWithoutUpdatedByInput[]
    upsert?: ReportTemplateUpsertWithWhereUniqueWithoutUpdatedByInput | ReportTemplateUpsertWithWhereUniqueWithoutUpdatedByInput[]
    createMany?: ReportTemplateCreateManyUpdatedByInputEnvelope
    set?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    disconnect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    delete?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    connect?: ReportTemplateWhereUniqueInput | ReportTemplateWhereUniqueInput[]
    update?: ReportTemplateUpdateWithWhereUniqueWithoutUpdatedByInput | ReportTemplateUpdateWithWhereUniqueWithoutUpdatedByInput[]
    updateMany?: ReportTemplateUpdateManyWithWhereWithoutUpdatedByInput | ReportTemplateUpdateManyWithWhereWithoutUpdatedByInput[]
    deleteMany?: ReportTemplateScalarWhereInput | ReportTemplateScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutReportsInput = {
    create?: XOR<UserCreateWithoutReportsInput, UserUncheckedCreateWithoutReportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutReportsInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutReviewedReportsInput = {
    create?: XOR<UserCreateWithoutReviewedReportsInput, UserUncheckedCreateWithoutReviewedReportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutReviewedReportsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutReportsNestedInput = {
    create?: XOR<UserCreateWithoutReportsInput, UserUncheckedCreateWithoutReportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutReportsInput
    upsert?: UserUpsertWithoutReportsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutReportsInput, UserUpdateWithoutReportsInput>, UserUncheckedUpdateWithoutReportsInput>
  }

  export type UserUpdateOneWithoutReviewedReportsNestedInput = {
    create?: XOR<UserCreateWithoutReviewedReportsInput, UserUncheckedCreateWithoutReviewedReportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutReviewedReportsInput
    upsert?: UserUpsertWithoutReviewedReportsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutReviewedReportsInput, UserUpdateWithoutReviewedReportsInput>, UserUncheckedUpdateWithoutReviewedReportsInput>
  }

  export type UserCreateNestedOneWithoutUpdatedTemplatesInput = {
    create?: XOR<UserCreateWithoutUpdatedTemplatesInput, UserUncheckedCreateWithoutUpdatedTemplatesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUpdatedTemplatesInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutUpdatedTemplatesNestedInput = {
    create?: XOR<UserCreateWithoutUpdatedTemplatesInput, UserUncheckedCreateWithoutUpdatedTemplatesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUpdatedTemplatesInput
    upsert?: UserUpsertWithoutUpdatedTemplatesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUpdatedTemplatesInput, UserUpdateWithoutUpdatedTemplatesInput>, UserUncheckedUpdateWithoutUpdatedTemplatesInput>
  }

  export type UserCreateNestedOneWithoutAssignedTasksInput = {
    create?: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutCreatedTasksInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneWithoutAssignedTasksNestedInput = {
    create?: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedTasksInput
    upsert?: UserUpsertWithoutAssignedTasksInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAssignedTasksInput, UserUpdateWithoutAssignedTasksInput>, UserUncheckedUpdateWithoutAssignedTasksInput>
  }

  export type UserUpdateOneRequiredWithoutCreatedTasksNestedInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    upsert?: UserUpsertWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedTasksInput, UserUpdateWithoutCreatedTasksInput>, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type UserCreateNestedOneWithoutUploadedFilesInput = {
    create?: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadedFilesInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutUploadedFilesNestedInput = {
    create?: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadedFilesInput
    upsert?: UserUpsertWithoutUploadedFilesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUploadedFilesInput, UserUpdateWithoutUploadedFilesInput>, UserUncheckedUpdateWithoutUploadedFilesInput>
  }

  export type UserCreateNestedOneWithoutNotificationsInput = {
    create?: XOR<UserCreateWithoutNotificationsInput, UserUncheckedCreateWithoutNotificationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutNotificationsInput
    connect?: UserWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutNotificationsNestedInput = {
    create?: XOR<UserCreateWithoutNotificationsInput, UserUncheckedCreateWithoutNotificationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutNotificationsInput
    upsert?: UserUpsertWithoutNotificationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutNotificationsInput, UserUpdateWithoutNotificationsInput>, UserUncheckedUpdateWithoutNotificationsInput>
  }

  export type UserCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutAuditLogsNestedInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    upsert?: UserUpsertWithoutAuditLogsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditLogsInput, UserUpdateWithoutAuditLogsInput>, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type ReportCreateWithoutUserInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    reviewer?: UserCreateNestedOneWithoutReviewedReportsInput
  }

  export type ReportUncheckedCreateWithoutUserInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedById?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportCreateOrConnectWithoutUserInput = {
    where: ReportWhereUniqueInput
    create: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput>
  }

  export type ReportCreateManyUserInputEnvelope = {
    data: ReportCreateManyUserInput | ReportCreateManyUserInput[]
  }

  export type ReportCreateWithoutReviewerInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutReportsInput
  }

  export type ReportUncheckedCreateWithoutReviewerInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    userId: string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportCreateOrConnectWithoutReviewerInput = {
    where: ReportWhereUniqueInput
    create: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput>
  }

  export type ReportCreateManyReviewerInputEnvelope = {
    data: ReportCreateManyReviewerInput | ReportCreateManyReviewerInput[]
  }

  export type TaskCreateWithoutAssigneeInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    creator: UserCreateNestedOneWithoutCreatedTasksInput
  }

  export type TaskUncheckedCreateWithoutAssigneeInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    createdById: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateOrConnectWithoutAssigneeInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput>
  }

  export type TaskCreateManyAssigneeInputEnvelope = {
    data: TaskCreateManyAssigneeInput | TaskCreateManyAssigneeInput[]
  }

  export type TaskCreateWithoutCreatorInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    assignee?: UserCreateNestedOneWithoutAssignedTasksInput
  }

  export type TaskUncheckedCreateWithoutCreatorInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    assigneeId?: string | null
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateOrConnectWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput>
  }

  export type TaskCreateManyCreatorInputEnvelope = {
    data: TaskCreateManyCreatorInput | TaskCreateManyCreatorInput[]
  }

  export type NotificationCreateWithoutUserInput = {
    id?: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
  }

  export type NotificationUncheckedCreateWithoutUserInput = {
    id?: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
  }

  export type NotificationCreateOrConnectWithoutUserInput = {
    where: NotificationWhereUniqueInput
    create: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput>
  }

  export type NotificationCreateManyUserInputEnvelope = {
    data: NotificationCreateManyUserInput | NotificationCreateManyUserInput[]
  }

  export type AuditLogCreateWithoutUserInput = {
    id?: string
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutUserInput = {
    id?: string
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogCreateManyUserInputEnvelope = {
    data: AuditLogCreateManyUserInput | AuditLogCreateManyUserInput[]
  }

  export type UploadedFileCreateWithoutUserInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    confirmedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type UploadedFileUncheckedCreateWithoutUserInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    confirmedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type UploadedFileCreateOrConnectWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    create: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput>
  }

  export type UploadedFileCreateManyUserInputEnvelope = {
    data: UploadedFileCreateManyUserInput | UploadedFileCreateManyUserInput[]
  }

  export type ReportTemplateCreateWithoutUpdatedByInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportTemplateUncheckedCreateWithoutUpdatedByInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportTemplateCreateOrConnectWithoutUpdatedByInput = {
    where: ReportTemplateWhereUniqueInput
    create: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput>
  }

  export type ReportTemplateCreateManyUpdatedByInputEnvelope = {
    data: ReportTemplateCreateManyUpdatedByInput | ReportTemplateCreateManyUpdatedByInput[]
  }

  export type ReportUpsertWithWhereUniqueWithoutUserInput = {
    where: ReportWhereUniqueInput
    update: XOR<ReportUpdateWithoutUserInput, ReportUncheckedUpdateWithoutUserInput>
    create: XOR<ReportCreateWithoutUserInput, ReportUncheckedCreateWithoutUserInput>
  }

  export type ReportUpdateWithWhereUniqueWithoutUserInput = {
    where: ReportWhereUniqueInput
    data: XOR<ReportUpdateWithoutUserInput, ReportUncheckedUpdateWithoutUserInput>
  }

  export type ReportUpdateManyWithWhereWithoutUserInput = {
    where: ReportScalarWhereInput
    data: XOR<ReportUpdateManyMutationInput, ReportUncheckedUpdateManyWithoutUserInput>
  }

  export type ReportScalarWhereInput = {
    AND?: ReportScalarWhereInput | ReportScalarWhereInput[]
    OR?: ReportScalarWhereInput[]
    NOT?: ReportScalarWhereInput | ReportScalarWhereInput[]
    id?: StringFilter<"Report"> | string
    ref?: StringFilter<"Report"> | string
    type?: StringFilter<"Report"> | string
    reportDate?: DateTimeFilter<"Report"> | Date | string
    userId?: StringFilter<"Report"> | string
    department?: StringFilter<"Report"> | string
    shiftTime?: StringNullableFilter<"Report"> | string | null
    clockIn?: StringNullableFilter<"Report"> | string | null
    clockOut?: StringNullableFilter<"Report"> | string | null
    attendanceStatus?: StringNullableFilter<"Report"> | string | null
    latenessMins?: IntNullableFilter<"Report"> | number | null
    kpiMetrics?: StringNullableFilter<"Report"> | string | null
    callLogs?: StringNullableFilter<"Report"> | string | null
    challenges?: StringNullableFilter<"Report"> | string | null
    escalations?: StringNullableFilter<"Report"> | string | null
    additionalActivities?: StringNullableFilter<"Report"> | string | null
    emailContext?: StringNullableFilter<"Report"> | string | null
    workEntries?: StringNullableFilter<"Report"> | string | null
    metricsSummary?: StringNullableFilter<"Report"> | string | null
    payload?: StringNullableFilter<"Report"> | string | null
    teamName?: StringNullableFilter<"Report"> | string | null
    campusLocation?: StringNullableFilter<"Report"> | string | null
    agentsManaged?: IntNullableFilter<"Report"> | number | null
    attendanceSummary?: StringNullableFilter<"Report"> | string | null
    teamKpiAverages?: StringNullableFilter<"Report"> | string | null
    coachingEntries?: StringNullableFilter<"Report"> | string | null
    qaObservations?: StringNullableFilter<"Report"> | string | null
    escalatedIssues?: StringNullableFilter<"Report"> | string | null
    highlights?: StringNullableFilter<"Report"> | string | null
    lowlights?: StringNullableFilter<"Report"> | string | null
    actionPlan?: StringNullableFilter<"Report"> | string | null
    managerReview?: StringNullableFilter<"Report"> | string | null
    status?: StringFilter<"Report"> | string
    supervisorFeedback?: StringNullableFilter<"Report"> | string | null
    reviewedById?: StringNullableFilter<"Report"> | string | null
    reviewedAt?: DateTimeNullableFilter<"Report"> | Date | string | null
    sourceType?: StringFilter<"Report"> | string
    sourceFileId?: StringNullableFilter<"Report"> | string | null
    verificationStatus?: StringFilter<"Report"> | string
    createdAt?: DateTimeFilter<"Report"> | Date | string
    updatedAt?: DateTimeFilter<"Report"> | Date | string
  }

  export type ReportUpsertWithWhereUniqueWithoutReviewerInput = {
    where: ReportWhereUniqueInput
    update: XOR<ReportUpdateWithoutReviewerInput, ReportUncheckedUpdateWithoutReviewerInput>
    create: XOR<ReportCreateWithoutReviewerInput, ReportUncheckedCreateWithoutReviewerInput>
  }

  export type ReportUpdateWithWhereUniqueWithoutReviewerInput = {
    where: ReportWhereUniqueInput
    data: XOR<ReportUpdateWithoutReviewerInput, ReportUncheckedUpdateWithoutReviewerInput>
  }

  export type ReportUpdateManyWithWhereWithoutReviewerInput = {
    where: ReportScalarWhereInput
    data: XOR<ReportUpdateManyMutationInput, ReportUncheckedUpdateManyWithoutReviewerInput>
  }

  export type TaskUpsertWithWhereUniqueWithoutAssigneeInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutAssigneeInput, TaskUncheckedUpdateWithoutAssigneeInput>
    create: XOR<TaskCreateWithoutAssigneeInput, TaskUncheckedCreateWithoutAssigneeInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutAssigneeInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutAssigneeInput, TaskUncheckedUpdateWithoutAssigneeInput>
  }

  export type TaskUpdateManyWithWhereWithoutAssigneeInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutAssigneeInput>
  }

  export type TaskScalarWhereInput = {
    AND?: TaskScalarWhereInput | TaskScalarWhereInput[]
    OR?: TaskScalarWhereInput[]
    NOT?: TaskScalarWhereInput | TaskScalarWhereInput[]
    id?: StringFilter<"Task"> | string
    title?: StringFilter<"Task"> | string
    description?: StringNullableFilter<"Task"> | string | null
    department?: StringFilter<"Task"> | string
    assigneeId?: StringNullableFilter<"Task"> | string | null
    createdById?: StringFilter<"Task"> | string
    category?: StringNullableFilter<"Task"> | string | null
    projectRef?: StringNullableFilter<"Task"> | string | null
    priority?: StringFilter<"Task"> | string
    status?: StringFilter<"Task"> | string
    requiredOutcome?: StringNullableFilter<"Task"> | string | null
    target?: StringNullableFilter<"Task"> | string | null
    kpiKey?: StringNullableFilter<"Task"> | string | null
    dateAssigned?: DateTimeFilter<"Task"> | Date | string
    deadline?: DateTimeNullableFilter<"Task"> | Date | string | null
    estimatedHours?: FloatNullableFilter<"Task"> | number | null
    actualHours?: FloatNullableFilter<"Task"> | number | null
    blocker?: StringNullableFilter<"Task"> | string | null
    nextSteps?: StringNullableFilter<"Task"> | string | null
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
  }

  export type TaskUpsertWithWhereUniqueWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutCreatorInput, TaskUncheckedUpdateWithoutCreatorInput>
    create: XOR<TaskCreateWithoutCreatorInput, TaskUncheckedCreateWithoutCreatorInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutCreatorInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutCreatorInput, TaskUncheckedUpdateWithoutCreatorInput>
  }

  export type TaskUpdateManyWithWhereWithoutCreatorInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutCreatorInput>
  }

  export type NotificationUpsertWithWhereUniqueWithoutUserInput = {
    where: NotificationWhereUniqueInput
    update: XOR<NotificationUpdateWithoutUserInput, NotificationUncheckedUpdateWithoutUserInput>
    create: XOR<NotificationCreateWithoutUserInput, NotificationUncheckedCreateWithoutUserInput>
  }

  export type NotificationUpdateWithWhereUniqueWithoutUserInput = {
    where: NotificationWhereUniqueInput
    data: XOR<NotificationUpdateWithoutUserInput, NotificationUncheckedUpdateWithoutUserInput>
  }

  export type NotificationUpdateManyWithWhereWithoutUserInput = {
    where: NotificationScalarWhereInput
    data: XOR<NotificationUpdateManyMutationInput, NotificationUncheckedUpdateManyWithoutUserInput>
  }

  export type NotificationScalarWhereInput = {
    AND?: NotificationScalarWhereInput | NotificationScalarWhereInput[]
    OR?: NotificationScalarWhereInput[]
    NOT?: NotificationScalarWhereInput | NotificationScalarWhereInput[]
    id?: StringFilter<"Notification"> | string
    userId?: StringFilter<"Notification"> | string
    type?: StringFilter<"Notification"> | string
    severity?: StringFilter<"Notification"> | string
    title?: StringFilter<"Notification"> | string
    message?: StringFilter<"Notification"> | string
    linkData?: StringNullableFilter<"Notification"> | string | null
    read?: BoolFilter<"Notification"> | boolean
    dedupeKey?: StringNullableFilter<"Notification"> | string | null
    createdAt?: DateTimeFilter<"Notification"> | Date | string
  }

  export type AuditLogUpsertWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutUserInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutUserInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    userId?: StringNullableFilter<"AuditLog"> | string | null
    actorName?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    entity?: StringFilter<"AuditLog"> | string
    entityId?: StringNullableFilter<"AuditLog"> | string | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
  }

  export type UploadedFileUpsertWithWhereUniqueWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    update: XOR<UploadedFileUpdateWithoutUserInput, UploadedFileUncheckedUpdateWithoutUserInput>
    create: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput>
  }

  export type UploadedFileUpdateWithWhereUniqueWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    data: XOR<UploadedFileUpdateWithoutUserInput, UploadedFileUncheckedUpdateWithoutUserInput>
  }

  export type UploadedFileUpdateManyWithWhereWithoutUserInput = {
    where: UploadedFileScalarWhereInput
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyWithoutUserInput>
  }

  export type UploadedFileScalarWhereInput = {
    AND?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
    OR?: UploadedFileScalarWhereInput[]
    NOT?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
    id?: StringFilter<"UploadedFile"> | string
    originalName?: StringFilter<"UploadedFile"> | string
    storedName?: StringFilter<"UploadedFile"> | string
    mimeType?: StringFilter<"UploadedFile"> | string
    sizeBytes?: IntFilter<"UploadedFile"> | number
    fileHash?: StringFilter<"UploadedFile"> | string
    extractStatus?: StringFilter<"UploadedFile"> | string
    extractError?: StringNullableFilter<"UploadedFile"> | string | null
    extractedData?: StringNullableFilter<"UploadedFile"> | string | null
    rawText?: StringNullableFilter<"UploadedFile"> | string | null
    reportDate?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    department?: StringNullableFilter<"UploadedFile"> | string | null
    reportId?: StringNullableFilter<"UploadedFile"> | string | null
    userId?: StringFilter<"UploadedFile"> | string
    confirmedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
  }

  export type ReportTemplateUpsertWithWhereUniqueWithoutUpdatedByInput = {
    where: ReportTemplateWhereUniqueInput
    update: XOR<ReportTemplateUpdateWithoutUpdatedByInput, ReportTemplateUncheckedUpdateWithoutUpdatedByInput>
    create: XOR<ReportTemplateCreateWithoutUpdatedByInput, ReportTemplateUncheckedCreateWithoutUpdatedByInput>
  }

  export type ReportTemplateUpdateWithWhereUniqueWithoutUpdatedByInput = {
    where: ReportTemplateWhereUniqueInput
    data: XOR<ReportTemplateUpdateWithoutUpdatedByInput, ReportTemplateUncheckedUpdateWithoutUpdatedByInput>
  }

  export type ReportTemplateUpdateManyWithWhereWithoutUpdatedByInput = {
    where: ReportTemplateScalarWhereInput
    data: XOR<ReportTemplateUpdateManyMutationInput, ReportTemplateUncheckedUpdateManyWithoutUpdatedByInput>
  }

  export type ReportTemplateScalarWhereInput = {
    AND?: ReportTemplateScalarWhereInput | ReportTemplateScalarWhereInput[]
    OR?: ReportTemplateScalarWhereInput[]
    NOT?: ReportTemplateScalarWhereInput | ReportTemplateScalarWhereInput[]
    id?: StringFilter<"ReportTemplate"> | string
    key?: StringFilter<"ReportTemplate"> | string
    name?: StringFilter<"ReportTemplate"> | string
    description?: StringNullableFilter<"ReportTemplate"> | string | null
    definition?: StringFilter<"ReportTemplate"> | string
    updatedById?: StringNullableFilter<"ReportTemplate"> | string | null
    createdAt?: DateTimeFilter<"ReportTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"ReportTemplate"> | Date | string
  }

  export type UserCreateWithoutReportsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutReportsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutReportsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutReportsInput, UserUncheckedCreateWithoutReportsInput>
  }

  export type UserCreateWithoutReviewedReportsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutReviewedReportsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutReviewedReportsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutReviewedReportsInput, UserUncheckedCreateWithoutReviewedReportsInput>
  }

  export type UserUpsertWithoutReportsInput = {
    update: XOR<UserUpdateWithoutReportsInput, UserUncheckedUpdateWithoutReportsInput>
    create: XOR<UserCreateWithoutReportsInput, UserUncheckedCreateWithoutReportsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutReportsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutReportsInput, UserUncheckedUpdateWithoutReportsInput>
  }

  export type UserUpdateWithoutReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUpsertWithoutReviewedReportsInput = {
    update: XOR<UserUpdateWithoutReviewedReportsInput, UserUncheckedUpdateWithoutReviewedReportsInput>
    create: XOR<UserCreateWithoutReviewedReportsInput, UserUncheckedCreateWithoutReviewedReportsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutReviewedReportsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutReviewedReportsInput, UserUncheckedUpdateWithoutReviewedReportsInput>
  }

  export type UserUpdateWithoutReviewedReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutReviewedReportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserCreateWithoutUpdatedTemplatesInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUpdatedTemplatesInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUpdatedTemplatesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUpdatedTemplatesInput, UserUncheckedCreateWithoutUpdatedTemplatesInput>
  }

  export type UserUpsertWithoutUpdatedTemplatesInput = {
    update: XOR<UserUpdateWithoutUpdatedTemplatesInput, UserUncheckedUpdateWithoutUpdatedTemplatesInput>
    create: XOR<UserCreateWithoutUpdatedTemplatesInput, UserUncheckedCreateWithoutUpdatedTemplatesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUpdatedTemplatesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUpdatedTemplatesInput, UserUncheckedUpdateWithoutUpdatedTemplatesInput>
  }

  export type UserUpdateWithoutUpdatedTemplatesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUpdatedTemplatesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutAssignedTasksInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutAssignedTasksInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutAssignedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
  }

  export type UserCreateWithoutCreatedTasksInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutCreatedTasksInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutCreatedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
  }

  export type UserUpsertWithoutAssignedTasksInput = {
    update: XOR<UserUpdateWithoutAssignedTasksInput, UserUncheckedUpdateWithoutAssignedTasksInput>
    create: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAssignedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAssignedTasksInput, UserUncheckedUpdateWithoutAssignedTasksInput>
  }

  export type UserUpdateWithoutAssignedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutAssignedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUpsertWithoutCreatedTasksInput = {
    update: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type UserUpdateWithoutCreatedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserCreateWithoutUploadedFilesInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutUploadedFilesInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutUploadedFilesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
  }

  export type UserUpsertWithoutUploadedFilesInput = {
    update: XOR<UserUpdateWithoutUploadedFilesInput, UserUncheckedUpdateWithoutUploadedFilesInput>
    create: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUploadedFilesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUploadedFilesInput, UserUncheckedUpdateWithoutUploadedFilesInput>
  }

  export type UserUpdateWithoutUploadedFilesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutUploadedFilesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserCreateWithoutNotificationsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutNotificationsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutNotificationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutNotificationsInput, UserUncheckedCreateWithoutNotificationsInput>
  }

  export type UserUpsertWithoutNotificationsInput = {
    update: XOR<UserUpdateWithoutNotificationsInput, UserUncheckedUpdateWithoutNotificationsInput>
    create: XOR<UserCreateWithoutNotificationsInput, UserUncheckedCreateWithoutNotificationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutNotificationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutNotificationsInput, UserUncheckedUpdateWithoutNotificationsInput>
  }

  export type UserUpdateWithoutNotificationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutNotificationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportCreateNestedManyWithoutUserInput
    reviewedReports?: ReportCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskCreateNestedManyWithoutCreatorInput
    notifications?: NotificationCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateCreateNestedManyWithoutUpdatedByInput
  }

  export type UserUncheckedCreateWithoutAuditLogsInput = {
    id?: string
    email: string
    passwordHash: string
    fullName: string
    role?: string
    department?: string
    team?: string | null
    employeeId?: string | null
    phone?: string | null
    status?: string
    approvedAt?: Date | string | null
    approvedById?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reports?: ReportUncheckedCreateNestedManyWithoutUserInput
    reviewedReports?: ReportUncheckedCreateNestedManyWithoutReviewerInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssigneeInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatorInput
    notifications?: NotificationUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    updatedTemplates?: ReportTemplateUncheckedCreateNestedManyWithoutUpdatedByInput
  }

  export type UserCreateOrConnectWithoutAuditLogsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
  }

  export type UserUpsertWithoutAuditLogsInput = {
    update: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type UserUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUpdateManyWithoutUpdatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    team?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    approvedById?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reports?: ReportUncheckedUpdateManyWithoutUserNestedInput
    reviewedReports?: ReportUncheckedUpdateManyWithoutReviewerNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssigneeNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatorNestedInput
    notifications?: NotificationUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    updatedTemplates?: ReportTemplateUncheckedUpdateManyWithoutUpdatedByNestedInput
  }

  export type ReportCreateManyUserInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedById?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportCreateManyReviewerInput = {
    id?: string
    ref: string
    type: string
    reportDate: Date | string
    userId: string
    department: string
    shiftTime?: string | null
    clockIn?: string | null
    clockOut?: string | null
    attendanceStatus?: string | null
    latenessMins?: number | null
    kpiMetrics?: string | null
    callLogs?: string | null
    challenges?: string | null
    escalations?: string | null
    additionalActivities?: string | null
    emailContext?: string | null
    workEntries?: string | null
    metricsSummary?: string | null
    payload?: string | null
    teamName?: string | null
    campusLocation?: string | null
    agentsManaged?: number | null
    attendanceSummary?: string | null
    teamKpiAverages?: string | null
    coachingEntries?: string | null
    qaObservations?: string | null
    escalatedIssues?: string | null
    highlights?: string | null
    lowlights?: string | null
    actionPlan?: string | null
    managerReview?: string | null
    status?: string
    supervisorFeedback?: string | null
    reviewedAt?: Date | string | null
    sourceType?: string
    sourceFileId?: string | null
    verificationStatus?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateManyAssigneeInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    createdById: string
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateManyCreatorInput = {
    id?: string
    title: string
    description?: string | null
    department: string
    assigneeId?: string | null
    category?: string | null
    projectRef?: string | null
    priority?: string
    status?: string
    requiredOutcome?: string | null
    target?: string | null
    kpiKey?: string | null
    dateAssigned?: Date | string
    deadline?: Date | string | null
    estimatedHours?: number | null
    actualHours?: number | null
    blocker?: string | null
    nextSteps?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type NotificationCreateManyUserInput = {
    id?: string
    type: string
    severity?: string
    title: string
    message: string
    linkData?: string | null
    read?: boolean
    dedupeKey?: string | null
    createdAt?: Date | string
  }

  export type AuditLogCreateManyUserInput = {
    id?: string
    actorName?: string | null
    action: string
    entity: string
    entityId?: string | null
    details?: string | null
    createdAt?: Date | string
  }

  export type UploadedFileCreateManyUserInput = {
    id?: string
    originalName: string
    storedName: string
    mimeType: string
    sizeBytes: number
    fileHash: string
    extractStatus?: string
    extractError?: string | null
    extractedData?: string | null
    rawText?: string | null
    reportDate?: Date | string | null
    department?: string | null
    reportId?: string | null
    confirmedAt?: Date | string | null
    createdAt?: Date | string
  }

  export type ReportTemplateCreateManyUpdatedByInput = {
    id?: string
    key: string
    name: string
    description?: string | null
    definition: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ReportUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviewer?: UserUpdateOneWithoutReviewedReportsNestedInput
  }

  export type ReportUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedById?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedById?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportUpdateWithoutReviewerInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutReportsNestedInput
  }

  export type ReportUncheckedUpdateWithoutReviewerInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportUncheckedUpdateManyWithoutReviewerInput = {
    id?: StringFieldUpdateOperationsInput | string
    ref?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    reportDate?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: StringFieldUpdateOperationsInput | string
    department?: StringFieldUpdateOperationsInput | string
    shiftTime?: NullableStringFieldUpdateOperationsInput | string | null
    clockIn?: NullableStringFieldUpdateOperationsInput | string | null
    clockOut?: NullableStringFieldUpdateOperationsInput | string | null
    attendanceStatus?: NullableStringFieldUpdateOperationsInput | string | null
    latenessMins?: NullableIntFieldUpdateOperationsInput | number | null
    kpiMetrics?: NullableStringFieldUpdateOperationsInput | string | null
    callLogs?: NullableStringFieldUpdateOperationsInput | string | null
    challenges?: NullableStringFieldUpdateOperationsInput | string | null
    escalations?: NullableStringFieldUpdateOperationsInput | string | null
    additionalActivities?: NullableStringFieldUpdateOperationsInput | string | null
    emailContext?: NullableStringFieldUpdateOperationsInput | string | null
    workEntries?: NullableStringFieldUpdateOperationsInput | string | null
    metricsSummary?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    teamName?: NullableStringFieldUpdateOperationsInput | string | null
    campusLocation?: NullableStringFieldUpdateOperationsInput | string | null
    agentsManaged?: NullableIntFieldUpdateOperationsInput | number | null
    attendanceSummary?: NullableStringFieldUpdateOperationsInput | string | null
    teamKpiAverages?: NullableStringFieldUpdateOperationsInput | string | null
    coachingEntries?: NullableStringFieldUpdateOperationsInput | string | null
    qaObservations?: NullableStringFieldUpdateOperationsInput | string | null
    escalatedIssues?: NullableStringFieldUpdateOperationsInput | string | null
    highlights?: NullableStringFieldUpdateOperationsInput | string | null
    lowlights?: NullableStringFieldUpdateOperationsInput | string | null
    actionPlan?: NullableStringFieldUpdateOperationsInput | string | null
    managerReview?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    supervisorFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    reviewedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    sourceType?: StringFieldUpdateOperationsInput | string
    sourceFileId?: NullableStringFieldUpdateOperationsInput | string | null
    verificationStatus?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpdateWithoutAssigneeInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    creator?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
  }

  export type TaskUncheckedUpdateWithoutAssigneeInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyWithoutAssigneeInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignee?: UserUpdateOneWithoutAssignedTasksNestedInput
  }

  export type TaskUncheckedUpdateWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    assigneeId?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyWithoutCreatorInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    department?: StringFieldUpdateOperationsInput | string
    assigneeId?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    projectRef?: NullableStringFieldUpdateOperationsInput | string | null
    priority?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    requiredOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    target?: NullableStringFieldUpdateOperationsInput | string | null
    kpiKey?: NullableStringFieldUpdateOperationsInput | string | null
    dateAssigned?: DateTimeFieldUpdateOperationsInput | Date | string
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    estimatedHours?: NullableFloatFieldUpdateOperationsInput | number | null
    actualHours?: NullableFloatFieldUpdateOperationsInput | number | null
    blocker?: NullableStringFieldUpdateOperationsInput | string | null
    nextSteps?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type NotificationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    severity?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    message?: StringFieldUpdateOperationsInput | string
    linkData?: NullableStringFieldUpdateOperationsInput | string | null
    read?: BoolFieldUpdateOperationsInput | boolean
    dedupeKey?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorName?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableStringFieldUpdateOperationsInput | string | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    originalName?: StringFieldUpdateOperationsInput | string
    storedName?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    fileHash?: StringFieldUpdateOperationsInput | string
    extractStatus?: StringFieldUpdateOperationsInput | string
    extractError?: NullableStringFieldUpdateOperationsInput | string | null
    extractedData?: NullableStringFieldUpdateOperationsInput | string | null
    rawText?: NullableStringFieldUpdateOperationsInput | string | null
    reportDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    reportId?: NullableStringFieldUpdateOperationsInput | string | null
    confirmedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateUpdateWithoutUpdatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateUncheckedUpdateWithoutUpdatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ReportTemplateUncheckedUpdateManyWithoutUpdatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    definition?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}
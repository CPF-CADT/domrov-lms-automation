import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";
export default ():PostgresConnectionOptions =>({
    type:'postgres',
    host:'localhost',
    username:'postgres',
    database:'domrov',
    password:'1234',
    port:5432,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true
})
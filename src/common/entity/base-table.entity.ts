import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
    CreateDateColumn,
    Entity,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';

@Entity()
export class BaseTable {
    @CreateDateColumn()
    @Exclude()
    @ApiHideProperty()
    createdAt: Date;

    @UpdateDateColumn()
    @ApiHideProperty()
    @Exclude()
    updatedAt: Date;

    @Exclude()
    @ApiHideProperty()
    @VersionColumn()
    version: number;
}

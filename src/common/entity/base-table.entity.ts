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
    @Exclude()
    @CreateDateColumn()
    @ApiHideProperty()
    createdAt: Date;

    @Exclude()
    @UpdateDateColumn()
    @ApiHideProperty()
    updatedAt: Date;

    @Exclude()
    @VersionColumn()
    @ApiHideProperty()
    version: number;
}

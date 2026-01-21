import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { Resource } from './resource.entity';
import { Module } from '../lesson/module.entity';

@Entity({ name: 'module_resources' })
export class ModuleResource extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Module, (module) => module.resources)
  @JoinColumn({ name: 'module_id' })
  module: Module; 

  @ManyToOne(() => Resource)
  @JoinColumn()
  resource: Resource; 
}
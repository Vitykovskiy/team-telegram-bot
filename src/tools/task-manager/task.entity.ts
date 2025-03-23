import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  title: string;

  @Column()
  assignee: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column('text')
  description: string;

  @Column('simple-json', { nullable: true })
  subtasks_codes: string[];

  @CreateDateColumn()
  created_at: Date;
}

import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Assessment } from "./assessment.entity";

@Entity({ name: 'rubrics' })
export class Rubrics extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column(({ type: 'text', }))
    definition: string;

    @Column({ type: 'float' })
    totalScore: number;

    @ManyToOne(() => Assessment, assessment => assessment.rubrics, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'assessment_id' })
    assessment: Assessment;

}

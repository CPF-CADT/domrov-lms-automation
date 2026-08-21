import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ResourceDTO {
    @ApiProperty({ example: 'Assignment Instructions', description: 'Title of the resource' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'https://storage.example.com/files/instructions.pdf', description: 'URL of the uploaded resource' })
    @IsString()
    url: string; // The URL returned by your file service earlier
}
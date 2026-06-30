# eleita_dbf_to_chart

Web application that receives DBF survey files and lets users create charts from selected rows.

## Project Overview

- **Purpose**: Upload DBF survey data files, browse/filter rows, select data subsets, and generate exportable charts
- **Input**: DBF files containing survey/poll data (demographics + question responses)
- **Template file**: `aguasbel.DBF` - 800 records, 57 fields (demographics + 35 question columns R01-R35)

## Data Structure (from aguasbel.DBF)

- **Format**: dBASE III+ (version 48)
- **Records**: 800
- **Fields**: 57 total
  - **Demographics**: CODFORM, LOCAL, SEXO, INSTRUCAO, IDADE, RENDA, BAIRRO
  - **Label fields**: NOMELOCAL, NOMESEXO, NOMEIDADE, NOMEINSTRU, NOMERENDA (human-readable labels)
  - **Metadata**: PESQUISADO (interviewee name), NUM (numeric id)
  - **Responses**: R01 through R35 (single-character coded answers A through O)
  - **7 trailing fields**: Empty/terminator

## Tech Stack

TBD during design phase

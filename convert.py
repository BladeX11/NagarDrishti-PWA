import mammoth

def convert():
    with open("NagarDrishti_Complete_Project_AI_Architecture.docx", "rb") as docx_file:
        result = mammoth.convert_to_markdown(docx_file)
        with open("NagarDrishti_Complete_Project_AI_Architecture.md", "w", encoding="utf-8") as md_file:
            md_file.write(result.value)

if __name__ == "__main__":
    convert()
